// frontend/src/components/SalesChart.jsx
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts'

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa']

function SalesChart({ data, type = 'line', title, height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>No hay datos para mostrar</p>
      </div>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#5a6f8a" fontSize={11} />
            <YAxis stroke="#5a6f8a" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 22, 40, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                color: '#eef7ff',
              }}
              labelStyle={{ color: '#8ea4c4' }}
            />
            <Legend wrapperStyle={{ color: '#8ea4c4', fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="ventas"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ fill: '#38bdf8', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="ganancias"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ fill: '#34d399', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#5a6f8a" fontSize={11} />
            <YAxis stroke="#5a6f8a" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 22, 40, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                color: '#eef7ff',
              }}
              labelStyle={{ color: '#8ea4c4' }}
            />
            <Legend wrapperStyle={{ color: '#8ea4c8', fontSize: 12 }} />
            <Bar dataKey="ventas" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ganancias" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        )

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#5a6f8a" fontSize={11} />
            <YAxis stroke="#5a6f8a" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 22, 40, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                color: '#eef7ff',
              }}
              labelStyle={{ color: '#8ea4c4' }}
            />
            <Legend wrapperStyle={{ color: '#8ea4c4', fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="ventas"
              stroke="#38bdf8"
              fill="url(#ventasGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="ganancias"
              stroke="#34d399"
              fill="url(#gananciasGradient)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gananciasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
          </AreaChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(12, 22, 40, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                color: '#eef7ff',
              }}
            />
          </PieChart>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ width: '100%', height }}>
      {title && (
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#eef7ff' }}>{title}</h3>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}

export default SalesChart
/**
 * Propósito: visualización de la evolución de ventas.
 * Responsabilidades: adaptar los datos de estadísticas al gráfico sin transformar datos persistidos.
 * Dependencias: useSalesStats y la librería de gráficos declarada por el proyecto.
 */
