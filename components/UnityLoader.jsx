"use client";

import React, { useState, useEffect } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

export default function UnityLoader({ containerName, courseId }) {
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [error, setError] = useState(null);
	const [logMessages, setLogMessages] = useState([]);

	// Fonction pour ajouter des logs
	const addLog = (message) => {
		setLogMessages((prev) => [
			...prev,
			`${new Date().toISOString().slice(11, 19)}: ${message}`,
		]);
	};

	// Construire les URLs pour Unity
	const baseUrl = `/api/blob/${containerName}`;
	const loaderUrl = `${baseUrl}/${courseId}.loader.js`;
	const dataUrl = `${baseUrl}/${courseId}.data`;
	const frameworkUrl = `${baseUrl}/${courseId}.framework.js`;
	const wasmUrl = `${baseUrl}/${courseId}.wasm`;

	// Initialiser le contexte Unity
	const {
		unityProvider,
		loadingProgression,
		isLoaded,
		error: unityError,
		addEventListener,
		removeEventListener,
		sendMessage,
	} = useUnityContext({
		loaderUrl: loaderUrl,
		dataUrl: dataUrl,
		frameworkUrl: frameworkUrl,
		codeUrl: wasmUrl,
		webGLContextAttributes: {
			preserveDrawingBuffer: true,
			powerPreference: "high-performance",
			failIfMajorPerformanceCaveat: false,
		},
		// Options avancées
		fetchTimeout: 60000, // 1 minute timeout
		disableWebAssemblyStreaming: true, // Important pour les fichiers compressés
		cacheControl: false, // Désactiver le cache
		maxRetries: 3, // Réessayer 3 fois max
	});

	// Mettre à jour la progression du chargement
	useEffect(() => {
		setLoadingProgress(Math.round(loadingProgression * 100));
		addLog(
			`Progression chargement: ${Math.round(loadingProgression * 100)}%`
		);
	}, [loadingProgression]);

	// Gérer les erreurs
	useEffect(() => {
		if (unityError) {
			setError(
				`Erreur Unity: ${unityError.message || "Erreur inconnue"}`
			);
			addLog(`ERREUR: ${unityError.message || "Erreur inconnue"}`);
			console.error("Erreur Unity:", unityError);
		}
	}, [unityError]);

	// Logger les URLs au chargement
	useEffect(() => {
		addLog(`Conteneur: ${containerName}, Cours: ${courseId}`);
		addLog(`URL du chargeur: ${loaderUrl}`);
		addLog(`URL des données: ${dataUrl}`);
		addLog(`URL du framework: ${frameworkUrl}`);
		addLog(`URL du wasm: ${wasmUrl}`);

		// Vérifier que les fichiers sont accessibles
		const checkUrl = async (url, label) => {
			try {
				const response = await fetch(url, { method: "HEAD" });
				addLog(
					`${label}: ${response.ok ? "OK" : "NON TROUVÉ"} (${
						response.status
					})`
				);

				// Si réponse OK, extraire les en-têtes pour déboguer
				if (response.ok) {
					const headers = {};
					response.headers.forEach((value, key) => {
						headers[key] = value;
					});
					addLog(`En-têtes ${label}: ${JSON.stringify(headers)}`);
				}
			} catch (e) {
				addLog(`ERREUR vérification ${label}: ${e.message}`);
			}
		};

		// Vérifier toutes les URLs
		checkUrl(loaderUrl, "Loader");
		checkUrl(dataUrl, "Data");
		checkUrl(frameworkUrl, "Framework");
		checkUrl(wasmUrl, "WASM");
	}, [containerName, courseId, loaderUrl, dataUrl, frameworkUrl, wasmUrl]);

	return (
		<div className="flex flex-col">
			{!isLoaded && (
				<div className="mb-4 p-4 bg-gray-100 rounded">
					<h3 className="text-lg font-bold mb-2">
						Chargement: {loadingProgress}%
					</h3>
					<div className="w-full bg-gray-200 rounded-full h-2.5">
						<div
							className="bg-blue-600 h-2.5 rounded-full"
							style={{ width: `${loadingProgress}%` }}
						></div>
					</div>
					{error && <div className="mt-2 text-red-500">{error}</div>}
				</div>
			)}

			{/* Conteneur Unity */}
			<div
				className="relative bg-black rounded-lg overflow-hidden"
				style={{ aspectRatio: "16/9" }}
			>
				<Unity
					unityProvider={unityProvider}
					style={{
						visibility: isLoaded ? "visible" : "hidden",
						width: "100%",
						height: "100%",
					}}
				/>
				{!isLoaded && (
					<div className="absolute inset-0 flex items-center justify-center text-white">
						Chargement de l'environnement 3D...
					</div>
				)}
			</div>

			{/* Logs de débogage */}
			<div className="mt-4 p-4 bg-gray-100 border rounded max-h-60 overflow-y-auto text-xs font-mono">
				<h3 className="font-bold mb-2">Logs de débogage:</h3>
				{logMessages.map((msg, i) => (
					<div key={i} className="mb-1">
						{msg}
					</div>
				))}
			</div>
		</div>
	);
}
