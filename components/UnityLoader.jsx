"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

export default function UnityLoader({ containerName, courseId }) {
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [error, setError] = useState(null);
	const [logMessages, setLogMessages] = useState([]);
	const [isUnityInitialized, setIsUnityInitialized] = useState(false);

	// Utilisation de useRef pour les valeurs qui ne doivent pas déclencher de re-render
	const urlsChecked = useRef(false);
	const lastProgressLogged = useRef(0);

	// Construire les URLs pour Unity avec timestamp pour éviter le cache
	// On place ceci dans une ref pour éviter les recalculs à chaque render
	const unityUrls = useRef({
		timestamp: Date.now(),
		baseUrl: `/api/blob/${containerName}`,
		get loaderUrl() {
			return `${this.baseUrl}/wisetrainer/${courseId}.loader.js`;
		},
		get dataUrl() {
			return `${this.baseUrl}/wisetrainer/${courseId}.data.gz`;
		},
		get frameworkUrl() {
			return `${this.baseUrl}/wisetrainer/${courseId}.framework.js.gz`;
		},
		get wasmUrl() {
			return `${this.baseUrl}/wisetrainer/${courseId}.wasm.gz`;
		},
	});

	// Fonction pour ajouter des logs (avec useCallback pour éviter les recréations)
	const addLog = useCallback((message) => {
		const logTime = new Date().toISOString().slice(11, 19);
		const formattedMessage = `${logTime}: ${message}`;
		console.log(formattedMessage); // Aussi afficher dans la console pour debug

		setLogMessages((prev) => [...prev, formattedMessage]);
	}, []);

	// Configuration Unity stable qui ne change pas entre les renders
	const {
		unityProvider,
		loadingProgression,
		isLoaded,
		error: unityError,
		addEventListener,
		removeEventListener,
		sendMessage,
		requestFullscreen,
	} = useUnityContext({
		loaderUrl: unityUrls.current.loaderUrl,
		dataUrl: unityUrls.current.dataUrl,
		frameworkUrl: unityUrls.current.frameworkUrl,
		codeUrl: unityUrls.current.wasmUrl,
		webGLContextAttributes: {
			preserveDrawingBuffer: true,
			powerPreference: "high-performance",
			failIfMajorPerformanceCaveat: false,
			alpha: false,
			stencil: true,
			antialias: true,
		},
		// Options avancées
		fetchTimeout: 120000, // 2 minutes timeout
		disableWebAssemblyStreaming: true, // Important pour les fichiers gzip
		cacheControl: false,
		maxRetries: 5,
	});

	// Fonction pour vérifier une URL (avec useCallback)
	const checkUrl = useCallback(
		async (url, label) => {
			try {
				const response = await fetch(url, { method: "HEAD" });
				if (response.ok) {
					// Récupérer et afficher tous les en-têtes
					const headers = {};
					response.headers.forEach((value, key) => {
						headers[key] = value;
					});
					addLog(`✅ ${label}: OK (${response.status})`);
					addLog(`📋 En-têtes ${label}: ${JSON.stringify(headers)}`);

					// Vérifier spécifiquement Content-Encoding pour les fichiers Unity
					if (label !== "Loader" && !headers["content-encoding"]) {
						addLog(
							`⚠️ ${label}: En-tête Content-Encoding manquant - les fichiers compressés ne fonctionneront pas correctement`
						);
					}
				} else {
					addLog(`❌ ${label}: NON TROUVÉ (${response.status})`);
				}
			} catch (e) {
				addLog(`❌ ERREUR vérification ${label}: ${e.message}`);
			}
		},
		[addLog]
	);

	// Vérifier les fichiers au chargement initial (une seule fois)
	useEffect(() => {
		// Éviter l'exécution si les paramètres sont manquants
		if (!containerName || !courseId) {
			return;
		}

		// Éviter les vérifications multiples
		if (urlsChecked.current) return;
		urlsChecked.current = true;

		// Initialiser le composant
		setIsUnityInitialized(true);

		// Logguer les informations
		addLog(`📁 Conteneur: ${containerName}, Cours: ${courseId}`);
		addLog(`🔗 URL du chargeur: ${unityUrls.current.loaderUrl}`);
		addLog(`🔗 URL des données: ${unityUrls.current.dataUrl}`);
		addLog(`🔗 URL du framework: ${unityUrls.current.frameworkUrl}`);
		addLog(`🔗 URL du wasm: ${unityUrls.current.wasmUrl}`);

		// Vérifier toutes les URLs
		const runChecks = async () => {
			await checkUrl(unityUrls.current.loaderUrl, "Loader");
			await checkUrl(unityUrls.current.dataUrl, "Data");
			await checkUrl(unityUrls.current.frameworkUrl, "Framework");
			await checkUrl(unityUrls.current.wasmUrl, "WASM");
		};

		runChecks();
	}, [containerName, courseId, addLog, checkUrl]);

	// Mettre à jour la progression du chargement (avec contrôle)
	useEffect(() => {
		if (!isUnityInitialized) return;

		const progress = Math.round(loadingProgression * 100);
		setLoadingProgress(progress);

		// N'ajouter un log que si la progression a changé significativement
		if (
			progress > 0 &&
			progress % 10 === 0 &&
			progress !== lastProgressLogged.current
		) {
			lastProgressLogged.current = progress;
			addLog(`⏳ Progression chargement: ${progress}%`);
		}
	}, [loadingProgression, isUnityInitialized, addLog]);

	// Gérer les erreurs
	useEffect(() => {
		if (unityError) {
			const errorMessage = unityError.message || "Erreur inconnue";
			setError(errorMessage);
			addLog(`❌ ERREUR Unity: ${errorMessage}`);
			console.error("Erreur Unity:", unityError);
		}
	}, [unityError, addLog]);

	// Événement de chargement terminé
	useEffect(() => {
		if (isLoaded) {
			addLog("✅ Unity WebGL chargé avec succès!");
		}
	}, [isLoaded, addLog]);

	// Handler pour demander le mode plein écran
	const handleFullscreen = useCallback(() => {
		if (isLoaded) {
			requestFullscreen(true);
		}
	}, [isLoaded, requestFullscreen]);

	// Fonction pour effacer les logs
	const clearLogs = useCallback(() => {
		setLogMessages([]);
	}, []);

	return (
		<div className="flex flex-col">
			{/* Bandeau de progression du chargement */}
			{!isLoaded && (
				<div className="mb-4 p-4 bg-gray-100 rounded">
					<h3 className="text-lg font-bold mb-2">
						Chargement: {loadingProgress}%
					</h3>
					<div className="w-full bg-gray-200 rounded-full h-2.5">
						<div
							className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
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
				{isUnityInitialized && (
					<Unity
						unityProvider={unityProvider}
						style={{
							visibility: isLoaded ? "visible" : "hidden",
							width: "100%",
							height: "100%",
						}}
						className="rounded-lg"
					/>
				)}

				{!isLoaded && (
					<div className="absolute inset-0 flex items-center justify-center text-white">
						Chargement de l'environnement 3D...
					</div>
				)}

				{isLoaded && (
					<button
						onClick={handleFullscreen}
						className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded hover:bg-black/80"
					>
						Plein écran
					</button>
				)}
			</div>

			{/* Bouton pour rafraîchir si erreur */}
			{error && (
				<div className="mt-4 flex justify-center">
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Réessayer
					</button>
				</div>
			)}

			{/* Logs de débogage */}
			<div className="mt-4 p-4 bg-gray-100 border rounded max-h-60 overflow-y-auto text-xs font-mono">
				<h3 className="font-bold mb-2 flex justify-between">
					<span>Logs de débogage:</span>
					<button
						onClick={clearLogs}
						className="text-xs text-gray-500 hover:text-red-500"
					>
						Effacer
					</button>
				</h3>
				{logMessages.length === 0 ? (
					<div className="text-gray-500">
						Aucun log pour le moment...
					</div>
				) : (
					logMessages.map((msg, i) => (
						<div key={i} className="mb-1">
							{msg}
						</div>
					))
				)}
			</div>
		</div>
	);
}
