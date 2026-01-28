export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />}
      <h3 className="text-xl font-bold text-zinc-400 mb-2">{title}</h3>
      {description && <p className="text-zinc-600">{description}</p>}
    </div>
  );
}