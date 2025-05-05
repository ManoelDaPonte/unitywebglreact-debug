// app/api/blob/[...path]/route.js
import { NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";

export async function GET(request, { params }) {
  try {
    // Récupérer les paramètres de l'URL
    const path = params.path;
    if (!path || path.length < 2) {
      return NextResponse.json(
        { error: "Format URL attendu: /api/blob/[containerName]/[blobPath]" },
        { status: 400 }
      );
    }

    // Le premier segment est le containerName, le reste est le chemin du blob
    const containerName = path[0];
    const blobPath = path.slice(1).join("/");

    console.log(`[DEBUG] Accès fichier: ${containerName}/${blobPath}`);

    // Connexion à Azure Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    // Récupération du client container
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Vérifier si le chemin nécessite une gestion .gz (adapté des fichiers Unity WebGL)
    let blobClient = containerClient.getBlobClient(blobPath);
    let exists = await blobClient.exists();
    let actualBlobPath = blobPath;
    let isCompressed = false;

    // Si le fichier n'existe pas et qu'il ressemble à un fichier Unity WebGL
    // (.data, .framework.js, .wasm), essayer avec l'extension .gz
    if (!exists && (
      blobPath.endsWith(".data") ||
      blobPath.endsWith(".framework.js") ||
      blobPath.endsWith(".wasm")
    )) {
      // Essayer avec l'extension .gz
      const compressedPath = `${blobPath}.gz`;
      console.log(`[DEBUG] Fichier non trouvé, essai avec: ${containerName}/${compressedPath}`);
      
      const compressedBlobClient = containerClient.getBlobClient(compressedPath);
      const compressedExists = await compressedBlobClient.exists();
      
      if (compressedExists) {
        console.log(`[DEBUG] Fichier compressé trouvé: ${containerName}/${compressedPath}`);
        blobClient = compressedBlobClient;
        exists = true;
        actualBlobPath = compressedPath;
        isCompressed = true;
      }
    }

    // Vérifier si le blob existe après nos tentatives
    if (!exists) {
      console.log(`[DEBUG] Fichier introuvable: ${containerName}/${blobPath}`);
      return NextResponse.json(
        { error: `Fichier introuvable: ${blobPath}` },
        { status: 404 }
      );
    }

    // Télécharger le contenu du blob
    const downloadResponse = await blobClient.download();
    const content = await streamToBuffer(downloadResponse.readableStreamBody);

    console.log(`[DEBUG] Contenu téléchargé: ${content.length} octets`);

    // Configurer les en-têtes HTTP
    const headers = {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Expose-Headers": "Content-Length, Content-Type, Content-Encoding",
      "Content-Length": content.length.toString(),
      "Accept-Ranges": "bytes",
    };

    // Déterminer le type MIME
    let contentType = "application/octet-stream"; // Type par défaut
    
    if (blobPath.endsWith(".framework.js") || blobPath.endsWith(".js") || blobPath.endsWith(".loader.js")) {
      contentType = "application/javascript";
    } else if (blobPath.endsWith(".wasm")) {
      contentType = "application/wasm";
    } else if (blobPath.endsWith(".data")) {
      contentType = "application/octet-stream";
    }
    
    headers["Content-Type"] = contentType;

    // Si le fichier est compressé, ajouter l'en-tête Content-Encoding
    if (isCompressed || actualBlobPath.endsWith(".gz")) {
      headers["Content-Encoding"] = "gzip";
      console.log(`[DEBUG] Ajout en-tête: Content-Encoding: gzip`);
    }

    console.log(`[DEBUG] En-têtes: ${JSON.stringify(headers)}`);

    // Retourner les données avec les en-têtes appropriés
    return new NextResponse(content, { headers });
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    return NextResponse.json(
      { error: "Échec de récupération", details: error.message },
      { status: 500 }
    );
  }
}

// Utilitaire pour convertir un flux en buffer
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}