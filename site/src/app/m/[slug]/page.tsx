// Page publique de visualisation 3D / AR
// URL : scanar.io/m/<slug>
export default function ViewerPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main>
      {/* model-viewer sera injecté ici */}
      <p>Viewer AR — {params.slug}</p>
    </main>
  );
}
