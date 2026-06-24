export const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white rounded-xl p-4 border border-brand-100">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="text-2xl font-semibold text-brand-700">{value}</div>
  </div>
);
