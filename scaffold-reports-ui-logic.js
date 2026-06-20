const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'app', 'dashboard', 'reports');

function updateUI(reportId, title, exportColumns, tableHeaders, rowMap, extraContent = '') {
  const filePath = path.join(baseDir, reportId, 'page.tsx');
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace handleExport
  const newExport = \`
  const handleExport = async (format: 'excel' | 'pdf') => {
    toast.loading(\\\`Exporting \\\${format.toUpperCase()}...\\\`, { id: 'export' });
    try {
      const res = await fetch(\\\`/api/reports/export/\\\${format}\\\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '\\\${title}',
          columns: \${JSON.stringify(exportColumns)},
          data: data.rows || []
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \\\`\\\${title.replace(/ /g, '_')}.\\\${format === 'excel' ? 'xlsx' : 'pdf'}\\\`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export completed', { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };
  \`;
  content = content.replace(/const handleExport = async[^}]+\n  \};/, newExport.trim());
  
  // Replace UI
  const newUI = \`
      \${extraContent}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-800 border-b border-gray-100">
              <tr>
                \${tableHeaders.map(h => \`<th className="px-6 py-4 font-semibold">\${h}</th>\`).join('\\n                ')}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows?.length > 0 ? data.rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  \${rowMap}
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    <EmptyState title="No Data Found" description="No records match the selected filters." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  \`;
  
  content = content.replace(/<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">[\s\S]*?<\/div>/, newUI.trim());
  
  // Add chart imports if missing
  if (!content.includes('LineChart')) {
    content = content.replace('import { Download } from "lucide-react";', 'import { Download } from "lucide-react";\\nimport { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";');
  }

  fs.writeFileSync(filePath, content);
}

// 1. Batch Profitability
updateUI('batch-profitability', 'Batch Profitability Report',
  [{ header: 'Batch', key: 'batch' }, { header: 'Category', key: 'category' }, { header: 'Animal Count', key: 'animalCount' }, { header: 'Feed Cost', key: 'feedCost' }, { header: 'Utility Cost', key: 'utilityCost' }, { header: 'Revenue', key: 'revenue' }, { header: 'Net Profit', key: 'netProfit' }, { header: 'ROI %', key: 'roi' }],
  ['Batch', 'Category', 'Animal Count', 'Feed Cost (₹)', 'Utility Cost (₹)', 'Revenue (₹)', 'Net Profit (₹)', 'ROI %'],
  \`
                  <td className="px-6 py-4 font-medium text-gray-900">{row.batch}</td>
                  <td className="px-6 py-4">{row.category}</td>
                  <td className="px-6 py-4">{row.animalCount}</td>
                  <td className="px-6 py-4">₹{row.feedCost?.toFixed(2)}</td>
                  <td className="px-6 py-4">₹{row.utilityCost?.toFixed(2)}</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">₹{row.revenue?.toFixed(2)}</td>
                  <td className={\\\`px-6 py-4 font-bold \\\${row.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}\\\`}>₹{row.netProfit?.toFixed(2)}</td>
                  <td className="px-6 py-4">{row.roi?.toFixed(2)}%</td>
  \`
);

// 2. Mortality
updateUI('mortality', 'Mortality Report',
  [{ header: 'Date', key: 'date' }, { header: 'Batch', key: 'batch' }, { header: 'Category', key: 'category' }, { header: 'Quantity', key: 'quantity' }, { header: 'Reason', key: 'reason' }],
  ['Date', 'Batch', 'Category', 'Quantity', 'Reason'],
  \`
                  <td className="px-6 py-4 font-medium">{row.date}</td>
                  <td className="px-6 py-4">{row.batch}</td>
                  <td className="px-6 py-4">{row.category}</td>
                  <td className="px-6 py-4 font-bold text-red-500">{row.quantity}</td>
                  <td className="px-6 py-4">{row.reason}</td>
  \`,
  \`
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Deaths</p>
          <h4 className="text-2xl font-bold text-gray-900">{data.kpis?.totalDeaths || 0}</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Mortality Rate</p>
          <h4 className="text-2xl font-bold text-gray-900">{data.kpis?.mortalityRate?.toFixed(2) || 0}%</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Most Affected Batch</p>
          <h4 className="text-2xl font-bold text-gray-900">{data.kpis?.mostAffectedBatch || '-'}</h4>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm h-[300px]">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Mortality Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.charts?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm h-[300px]">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.charts?.byCategory || []} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                {(data.charts?.byCategory || []).map((_: any, i: number) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6'][i%3]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
  \`
);

// 3. Feed
updateUI('feed', 'Feed Consumption Report',
  [{ header: 'Feed Type', key: 'feedType' }, { header: 'Quantity (kg)', key: 'quantity' }, { header: 'Cost (₹)', key: 'cost' }],
  ['Feed Type', 'Quantity (kg)', 'Cost (₹)'],
  \`
                  <td className="px-6 py-4 font-medium">{row.feedType}</td>
                  <td className="px-6 py-4">{row.quantity} kg</td>
                  <td className="px-6 py-4 font-medium text-red-500">₹{row.cost?.toFixed(2)}</td>
  \`,
  \`
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Consumed</p>
          <h4 className="text-2xl font-bold text-gray-900">{data.kpis?.totalConsumed || 0} kg</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Cost</p>
          <h4 className="text-2xl font-bold text-red-600">₹{data.kpis?.totalCost?.toFixed(2) || 0}</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Feed Efficiency</p>
          <h4 className="text-2xl font-bold text-emerald-600">{data.kpis?.feedEfficiency?.toFixed(2) || 0} kg/A</h4>
        </div>
      </div>
  \`
);

// 4. Water
updateUI('water', 'Water Usage Report',
  [{ header: 'Date', key: 'date' }, { header: 'Room', key: 'room' }, { header: 'Consumption (L)', key: 'consumption' }, { header: 'Cost (₹)', key: 'cost' }],
  ['Date', 'Room', 'Consumption (L)', 'Cost (₹)'],
  \`
                  <td className="px-6 py-4 font-medium">{row.date}</td>
                  <td className="px-6 py-4">{row.room}</td>
                  <td className="px-6 py-4 text-cyan-600">{row.consumption} L</td>
                  <td className="px-6 py-4 text-red-500">₹{row.cost?.toFixed(2)}</td>
  \`,
  \`
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Consumed</p>
          <h4 className="text-2xl font-bold text-cyan-600">{data.kpis?.totalConsumption || 0} L</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Cost</p>
          <h4 className="text-2xl font-bold text-red-600">₹{data.kpis?.totalCost?.toFixed(2) || 0}</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Water Per Animal</p>
          <h4 className="text-2xl font-bold text-emerald-600">{data.kpis?.waterPerAnimal?.toFixed(2) || 0} L/A</h4>
        </div>
      </div>
  \`
);

// 5. Electricity
updateUI('electricity', 'Electricity Usage Report',
  [{ header: 'Date', key: 'date' }, { header: 'Meter', key: 'meter' }, { header: 'Units (kWh)', key: 'consumption' }, { header: 'Cost (₹)', key: 'cost' }],
  ['Date', 'Meter', 'Units (kWh)', 'Cost (₹)'],
  \`
                  <td className="px-6 py-4 font-medium">{row.date}</td>
                  <td className="px-6 py-4">{row.meter}</td>
                  <td className="px-6 py-4 text-yellow-600">{row.consumption} kWh</td>
                  <td className="px-6 py-4 text-red-500">₹{row.cost?.toFixed(2)}</td>
  \`,
  \`
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Consumed</p>
          <h4 className="text-2xl font-bold text-yellow-600">{data.kpis?.totalConsumption || 0} kWh</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Cost</p>
          <h4 className="text-2xl font-bold text-red-600">₹{data.kpis?.totalCost?.toFixed(2) || 0}</h4>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Elec Per Animal</p>
          <h4 className="text-2xl font-bold text-emerald-600">{data.kpis?.elecPerAnimal?.toFixed(2) || 0} kWh/A</h4>
        </div>
      </div>
  \`
);

// 6. Customers
updateUI('customers', 'Customer Revenue Ranking',
  [{ header: 'Customer Name', key: 'customer', width: 200 }, { header: 'Invoice Count', key: 'count' }, { header: 'Last Purchase', key: 'lastDate' }, { header: 'Revenue (₹)', key: 'revenue' }, { header: 'Outstanding (₹)', key: 'outstanding' }],
  ['Customer Name', 'Invoice Count', 'Last Purchase', 'Revenue (₹)', 'Outstanding (₹)'],
  \`
                  <td className="px-6 py-4 font-medium">{row.customer}</td>
                  <td className="px-6 py-4">{row.count}</td>
                  <td className="px-6 py-4">{row.lastDate}</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">₹{row.revenue?.toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold text-red-500">₹{row.outstanding?.toFixed(2)}</td>
  \`
);

// 7. Suppliers
updateUI('suppliers', 'Supplier Comparison',
  [{ header: 'Supplier Name', key: 'supplier', width: 200 }, { header: 'Linked Feeds', key: 'linkedFeedTypes' }, { header: 'Usage Frequency', key: 'usageFreq' }],
  ['Supplier Name', 'Linked Feeds', 'Usage Frequency'],
  \`
                  <td className="px-6 py-4 font-medium">{row.supplier}</td>
                  <td className="px-6 py-4">{row.linkedFeedTypes}</td>
                  <td className="px-6 py-4 font-bold text-blue-600">{row.usageFreq}</td>
  \`
);

console.log('UI logic injected.');
