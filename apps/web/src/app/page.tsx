export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-sm text-slate-400">Holistic financial health, spending patterns, and cash flow forecast.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          + Upload Statement (CSV/PDF)
        </button>
      </div>

      {/* Above-the-fold 3 Visuals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-1">Net Position</h3>
          <p className="text-3xl font-bold text-white tracking-tight">₹1,12,400</p>
          <p className="text-xs text-slate-400 mt-2">HDFC Bank (₹74k) + SBI (₹38.4k)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-1">Monthly Essentials vs Discretionary</h3>
          <p className="text-3xl font-bold text-emerald-400 tracking-tight">64% / 36%</p>
          <p className="text-xs text-slate-400 mt-2">Essentials: ₹38,700/mo</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-1">Safety Buffer</h3>
          <p className="text-3xl font-bold text-indigo-400 tracking-tight">₹58,000</p>
          <p className="text-xs text-slate-400 mt-2">1.5× monthly essentials (Variable income)</p>
        </div>
      </div>

      {/* Ask Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3">
        <input 
          type="text" 
          placeholder='Ask anything: "Can I afford an ₹80,000 phone next month?"'
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
          Evaluate
        </button>
      </div>
    </div>
  );
}
