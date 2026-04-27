// Page détail d'un modèle — viewer 3D + stats + QR code
export default function ModelDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Modèle {params.id}</h1>
    </div>
  );
}
