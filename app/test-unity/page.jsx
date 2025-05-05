"use client";

import { useState } from "react";
import UnityLoader from "@/components/UnityLoader";

export default function TestUnityPage() {
	const [containerName, setContainerName] = useState("");
	const [courseId, setCourseId] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [testActive, setTestActive] = useState(false);

	const handleSubmit = (e) => {
		e.preventDefault();
		setTestActive(true);
		setIsLoading(true);
		// Le chargement sera géré par le composant UnityLoader
	};

	return (
		<main className="container mx-auto p-4 max-w-4xl">
			<h1 className="text-2xl font-bold mb-6">
				Test de chargement Unity WebGL depuis Azure
			</h1>

			<div className="mb-8 p-4 border rounded-lg bg-gray-50">
				<h2 className="text-xl font-bold mb-4">Configuration</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block mb-1">
							Nom du conteneur Azure:
						</label>
						<input
							type="text"
							value={containerName}
							onChange={(e) => setContainerName(e.target.value)}
							className="w-full p-2 border rounded"
							placeholder="Ex: user-daponte-manoel-qs6w0w"
							required
						/>
					</div>

					<div>
						<label className="block mb-1">
							ID du cours (sans extensions):
						</label>
						<input
							type="text"
							value={courseId}
							onChange={(e) => setCourseId(e.target.value)}
							className="w-full p-2 border rounded"
							placeholder="Ex: WiseTrainer_ZoneLogistique-Cariste"
							required
						/>
						<p className="text-sm text-gray-500 mt-1">
							Ne pas inclure les extensions (.data, .framework.js,
							etc.)
						</p>
					</div>

					<button
						type="submit"
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						disabled={isLoading}
					>
						{isLoading
							? "Chargement en cours..."
							: "Charger la build Unity"}
					</button>
				</form>
			</div>

			{testActive && (
				<div className="p-4 border rounded-lg">
					<h2 className="text-xl font-bold mb-4">Résultat du test</h2>
					<UnityLoader
						containerName={containerName}
						courseId={courseId}
					/>
				</div>
			)}

			<div className="mt-8 p-4 border rounded-lg bg-gray-50">
				<h2 className="text-xl font-bold mb-2">Instructions</h2>
				<ol className="list-decimal pl-5 space-y-2">
					<li>
						Renseignez le nom du conteneur Azure et l&apos;ID du
						cours
					</li>
					<li>Cliquez sur &quot;Charger la build Unity&quot;</li>
					<li>
						Observez les logs de débogage pour identifier les
						problèmes
					</li>
					<li>
						Vérifiez dans la console du navigateur (F12) pour plus
						de détails
					</li>
				</ol>

				<div className="mt-4">
					<h3 className="font-bold">
						Résolution des problèmes courants
					</h3>
					<ul className="list-disc pl-5 mt-2 space-y-1">
						<li>
							Erreur <code>Content-Encoding</code>: Vérifiez que
							les en-têtes sont correctement configurés dans
							l&apos;API
						</li>
						<li>
							Erreur CORS: Assurez-vous que les en-têtes CORS sont
							présents
						</li>
						<li>
							Fichiers manquants: Vérifiez la structure des
							fichiers dans le blob storage
						</li>
						<li>
							Vérifiez que les fichiers .gz sont correctement
							servis avec l&apos;en-tête Content-Encoding: gzip
						</li>
					</ul>
				</div>
			</div>
		</main>
	);
}
