import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estadisticasService } from '../../services/estadisticas'

export default function DashboardStats() {
  const [tooltip, setTooltip] = useState<{x: number, y: number, dia: number, cantidad: number} | null>(null)
  const [mostrarRegresion, setMostrarRegresion] = useState(false)
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => estadisticasService.getDashboard(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
    refetchOnWindowFocus: true, // Refrescar al enfocar la ventana
  })

  if (error) {
    console.error('Error al cargar estadísticas:', error)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      title: 'Total Equipos',
      value: stats.resumen.total_equipos,
      icon: '💻',
      color: 'from-slate-800/60 to-slate-900/80 border-slate-700/50',
      textColor: 'text-gray-400',
      accentColor: 'text-cyan-400'
    },
    {
      title: 'Préstamos Activos',
      value: stats.resumen.prestamos_activos,
      icon: '📦',
      color: 'from-slate-800/60 to-slate-900/80 border-slate-700/50',
      textColor: 'text-gray-400',
      accentColor: 'text-emerald-400'
    },
    {
      title: 'Trabajadores Activos',
      value: stats.resumen.trabajadores_activos,
      icon: '👥',
      color: 'from-slate-800/60 to-slate-900/80 border-slate-700/50',
      textColor: 'text-gray-400',
      accentColor: 'text-violet-400'
    },
    {
      title: 'Alertas Pendientes',
      value: stats.resumen.alertas_pendientes,
      icon: '⚠️',
      color: 'from-slate-800/60 to-slate-900/80 border-slate-700/50',
      textColor: 'text-gray-400',
      accentColor: 'text-amber-400'
    },
  ]

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${card.color} rounded-xl p-6 border backdrop-blur-sm hover:scale-[1.02] hover:shadow-xl transition-all duration-300 group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1 font-medium">{card.title}</p>
                <span className={`text-4xl font-bold ${card.accentColor} group-hover:scale-110 transition-transform duration-300`}>
                  {card.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos: Regresión Lineal y Torta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Regresión Lineal - Préstamos del Mes Actual */}
        {stats.prestamos_por_mes && stats.prestamos_por_mes.length > 0 && stats.prestamos_por_mes[0].por_dia && (
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">📊 Regresión Lineal - Préstamos del Mes</h3>
              <button
                onClick={() => setMostrarRegresion(!mostrarRegresion)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-white text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
              >
                {mostrarRegresion ? 'Ocultar Regresión Lineal' : 'Generar Regresión Lineal'}
              </button>
            </div>
            {(() => {
              const datosRaw = stats.prestamos_por_mes[0].por_dia || []
              
              if (datosRaw.length === 0) {
                return <p className="text-gray-400 text-center py-8">No hay datos para mostrar</p>
              }
              
              // Obtener el día actual del mes (solo hasta hoy, no días futuros)
              const hoy = new Date()
              const diaActual = hoy.getDate()
              
              // El backend ya devuelve TODOS los días desde el 1 hasta hoy (incluso con 0 préstamos)
              // Solo necesitamos filtrar días futuros por si acaso
              const datos = datosRaw.filter(d => d.dia <= diaActual)
              
              // Asegurarnos de que tenemos todos los días desde el 1 hasta hoy
              // Si falta algún día, rellenarlo con 0
              const datosCompletos: {dia: number, cantidad: number}[] = []
              for (let dia = 1; dia <= diaActual; dia++) {
                const datoExistente = datos.find(d => d.dia === dia)
                datosCompletos.push({
                  dia: dia,
                  cantidad: datoExistente ? datoExistente.cantidad : 0
                })
              }
              
              // Usar los datos completos para la regresión (incluye días con 0 préstamos)
              const datosParaRegresion = datosCompletos
              
              // Calcular regresión lineal (mínimos cuadrados) usando TODOS los días hasta hoy
              const n = datosParaRegresion.length
              const sumX = datosParaRegresion.reduce((sum, d) => sum + d.dia, 0)
              const sumY = datosParaRegresion.reduce((sum, d) => sum + d.cantidad, 0)
              const sumXY = datosParaRegresion.reduce((sum, d) => sum + d.dia * d.cantidad, 0)
              const sumX2 = datosParaRegresion.reduce((sum, d) => sum + d.dia * d.dia, 0)
              
              // Evitar división por cero
              const denominador = (n * sumX2 - sumX * sumX)
              const pendiente = denominador !== 0 ? (n * sumXY - sumX * sumY) / denominador : 0
              const intercepto = (sumY - pendiente * sumX) / n
              
              // Calcular R² (coeficiente de determinación)
              const yPromedio = sumY / n
              const ssRes = datosParaRegresion.reduce((sum, d) => {
                const yPredicho = pendiente * d.dia + intercepto
                return sum + Math.pow(d.cantidad - yPredicho, 2)
              }, 0)
              const ssTot = datosParaRegresion.reduce((sum, d) => sum + Math.pow(d.cantidad - yPromedio, 2), 0)
              const rCuadrado = ssTot > 0 ? 1 - (ssRes / ssTot) : 0
              
              // Obtener el primer y último día (siempre desde el 1 hasta hoy)
              const primerDia = 1
              const ultimoDia = diaActual
              
              // Crear puntos de regresión solo para el rango de datos reales (no proyectar)
              const puntosRegresion = []
              for (let dia = primerDia; dia <= ultimoDia; dia++) {
                const y = pendiente * dia + intercepto
                puntosRegresion.push({ x: dia, y: Math.max(0, y) })
              }
              
              // Escalar para el gráfico (usar datos completos para el máximo)
              const maxCantidad = Math.max(...datosParaRegresion.map(d => d.cantidad), 1)
              const maxYRegresion = Math.max(...puntosRegresion.map(p => p.y), maxCantidad)
              const maxY = Math.max(maxCantidad, maxYRegresion)
              const minDia = primerDia
              
              const ancho = 600
              const alto = 350
              const padding = 70
              const anchoUtil = ancho - padding * 2
              const altoUtil = alto - padding * 2
              
              const escalaX = (dia: number) => padding + ((dia - minDia) / (ultimoDia - minDia)) * anchoUtil
              const escalaY = (cantidad: number) => padding + altoUtil - (cantidad / maxY) * altoUtil
              
              return (
              <div className="relative">
                <svg 
                  width={ancho} 
                  height={alto} 
                  className="w-full cursor-crosshair" 
                  viewBox={`0 0 ${ancho} ${alto}`}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const svgX = ((e.clientX - rect.left) / rect.width) * ancho
                    const svgY = ((e.clientY - rect.top) / rect.height) * alto
                    
                    // Encontrar el punto más cercano
                    let puntoMasCercano = datos[0]
                    let distanciaMin = Infinity
                    
                    datos.forEach(d => {
                      const x = escalaX(d.dia)
                      const y = escalaY(d.cantidad)
                      const distancia = Math.sqrt(Math.pow(svgX - x, 2) + Math.pow(svgY - y, 2))
                      if (distancia < distanciaMin && distancia < 30) {
                        distanciaMin = distancia
                        puntoMasCercano = d
                      }
                    })
                    
                    if (distanciaMin < 30) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        dia: puntoMasCercano.dia,
                        cantidad: puntoMasCercano.cantidad
                      })
                    } else {
                      setTooltip(null)
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255, 107, 53, 0.8)" />
                      <stop offset="100%" stopColor="rgba(255, 107, 53, 1)" />
                    </linearGradient>
                    <linearGradient id="regressionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.7)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 1)" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* Cuadrícula de fondo */}
                  {[0, Math.ceil(maxY / 4), Math.ceil(maxY / 2), Math.ceil(maxY * 3 / 4), Math.ceil(maxY)].map((valor) => {
                    const y = escalaY(valor)
                    return (
                      <line
                        key={`grid-y-${valor}`}
                        x1={padding}
                        y1={y}
                        x2={ancho - padding}
                        y2={y}
                        stroke="#374151"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.3"
                      />
                    )
                  })}
                  
                  {/* Eje Y (vertical) */}
                  <line
                    x1={padding}
                    y1={padding}
                    x2={padding}
                    y2={alto - padding}
                    stroke="#6B7280"
                    strokeWidth="2"
                  />
                  
                  {/* Eje X (horizontal) */}
                  <line
                    x1={padding}
                    y1={alto - padding}
                    x2={ancho - padding}
                    y2={alto - padding}
                    stroke="#6B7280"
                    strokeWidth="2"
                  />
                  
                  {/* Etiquetas del eje Y */}
                  {[0, Math.ceil(maxY / 4), Math.ceil(maxY / 2), Math.ceil(maxY * 3 / 4), Math.ceil(maxY)].map((valor, i) => {
                    const y = escalaY(valor)
                    return (
                      <g key={`y-label-${i}`}>
                        <line
                          x1={padding - 5}
                          y1={y}
                          x2={padding}
                          y2={y}
                          stroke="#9CA3AF"
                          strokeWidth="1"
                        />
                        <text
                          x={padding - 12}
                          y={y + 4}
                          fill="#D1D5DB"
                          fontSize="11"
                          textAnchor="end"
                          fontWeight="500"
                        >
                          {Math.round(valor)}
                        </text>
                      </g>
                    )
                  })}
                  
                  {/* Etiquetas del eje X - Mostrar días desde el primero con datos hasta el día actual */}
                  {(() => {
                    const diasParaMostrar = []
                    const rangoDias = ultimoDia - primerDia + 1
                    const intervalo = Math.max(1, Math.ceil(rangoDias / 8)) // Mostrar aproximadamente 8 etiquetas
                    
                    for (let dia = primerDia; dia <= ultimoDia; dia += intervalo) {
                      diasParaMostrar.push(dia)
                    }
                    // Asegurar que el primer y último día siempre se muestren
                    if (diasParaMostrar[0] !== primerDia) {
                      diasParaMostrar.unshift(primerDia)
                    }
                    if (diasParaMostrar[diasParaMostrar.length - 1] !== ultimoDia) {
                      diasParaMostrar.push(ultimoDia)
                    }
                    
                    return diasParaMostrar.map((dia) => {
                      const x = escalaX(dia)
                      return (
                        <g key={`x-label-${dia}`}>
                          <line
                            x1={x}
                            y1={alto - padding}
                            x2={x}
                            y2={alto - padding + 5}
                            stroke="#9CA3AF"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={alto - padding + 18}
                            fill="#D1D5DB"
                            fontSize="10"
                            textAnchor="middle"
                            fontWeight="500"
                          >
                            {dia}
                          </text>
                        </g>
                      )
                    })
                  })()}
                  
                  {/* Línea de regresión lineal - Solo si está activada */}
                  {mostrarRegresion && puntosRegresion.length > 0 && (
                    <>
                      {/* Línea punteada de regresión */}
                      <path
                        d={`M ${puntosRegresion.map((p, i) => 
                          i === 0 ? `${escalaX(p.x)} ${escalaY(p.y)}` : `L ${escalaX(p.x)} ${escalaY(p.y)}`
                        ).join(' ')}`}
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="8,4"
                        opacity="0.9"
                        className="cursor-pointer"
                      />
                      {/* Puntos/marcadores a lo largo de la línea de regresión */}
                      {puntosRegresion.filter((_, i) => i % 3 === 0 || i === puntosRegresion.length - 1).map((p, idx) => (
                        <circle
                          key={`regression-point-${idx}`}
                          cx={escalaX(p.x)}
                          cy={escalaY(p.y)}
                          r="3.5"
                          fill="#3B82F6"
                          stroke="#1F2937"
                          strokeWidth="1.5"
                          opacity="0.9"
                        />
                      ))}
                    </>
                  )}
                  
                  {/* Puntos de datos - Mostrar todos los días hasta hoy, incluso con 0 */}
                  {datosParaRegresion.map((d, i) => {
                    const x = escalaX(d.dia)
                    const y = escalaY(d.cantidad)
                    
                    return (
                      <g key={`point-${i}`}>
                        {/* Punto de dato real */}
                        <circle
                          cx={x}
                          cy={y}
                          r="7"
                          fill="url(#lineGradient)"
                          stroke="#1F2937"
                          strokeWidth="2.5"
                          className="hover:r-9 transition-all"
                          filter="url(#glow)"
                        />
                        
                        {/* Valor sobre el punto */}
                        <text
                          x={x}
                          y={y - 14}
                          fill="#F3F4F6"
                          fontSize="12"
                          textAnchor="middle"
                          fontWeight="bold"
                          className="pointer-events-none"
                        >
                          {d.cantidad}
                        </text>
                      </g>
                    )
                  })}
                  
                  {/* Título de ejes */}
                  <text
                    x={ancho / 2}
                    y={alto - 15}
                    fill="#9CA3AF"
                    fontSize="12"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    Día del Mes
                  </text>
                  <text
                    x={20}
                    y={alto / 2}
                    fill="#9CA3AF"
                    fontSize="12"
                    textAnchor="middle"
                    fontWeight="600"
                    transform={`rotate(-90, 20, ${alto / 2})`}
                  >
                    Cantidad de Préstamos
                  </text>
                </svg>
                
                {/* Tooltip flotante */}
                {tooltip && (
                  <div
                    className="absolute bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl z-50 pointer-events-none"
                    style={{
                      left: `${tooltip.x + 10}px`,
                      top: `${tooltip.y - 40}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="text-white text-sm font-semibold">Día {tooltip.dia}</div>
                    <div className="text-minero-naranja text-xs">{tooltip.cantidad} préstamos</div>
                  </div>
                )}
                
                {/* Información de regresión */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-400">
                      Total: <span className="text-minero-naranja font-bold">{stats.prestamos_por_mes[0].cantidad}</span> préstamos
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-minero-naranja rounded-full"></div>
                        <span className="text-gray-400">Datos reales</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-400">Regresión lineal</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Estadísticas de regresión - Expandible */}
                  {mostrarRegresion && (
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-blue-500/30">
                      <div className="mb-3">
                        <div className="text-blue-400 text-sm font-semibold mb-2">📈 Análisis de Regresión Lineal</div>
                        <div className="text-gray-400 text-xs">La línea azul muestra la tendencia de los préstamos a lo largo del mes</div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-gray-500 mb-1">Pendiente (m)</div>
                          <div className="text-white font-semibold text-sm">{pendiente.toFixed(3)}</div>
                          <div className="text-gray-600 text-xs mt-1">
                            {pendiente > 0 ? '↗ Tendencia creciente' : pendiente < 0 ? '↘ Tendencia decreciente' : '→ Sin tendencia'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 mb-1">R² (Ajuste)</div>
                          <div className="text-white font-semibold text-sm">{(rCuadrado * 100).toFixed(1)}%</div>
                          <div className="text-gray-600 text-xs mt-1">
                            {rCuadrado > 0.7 ? '✓ Buen ajuste' : rCuadrado > 0.4 ? '⚠ Ajuste moderado' : '✗ Ajuste bajo'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 mb-1">Ecuación</div>
                          <div className="text-white text-xs bg-gray-800/50 px-2 py-1 rounded">
                            y = {pendiente.toFixed(2)}x + {intercepto.toFixed(2)}
                          </div>
                          <div className="text-gray-600 text-xs mt-1">y = préstamos, x = día</div>
                        </div>
                      </div>
                      
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
          </div>
        )}
        
        {/* Gráfico de Torta - Dispositivos Más Usados del Mes */}
        {stats.dispositivos_mas_usados && stats.dispositivos_mas_usados.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-6">🥧 Dispositivos Más Usados del Mes</h3>
            {(() => {
              const datos = stats.dispositivos_mas_usados.filter(d => d.cantidad > 0)
              const total = datos.reduce((sum, d) => sum + d.cantidad, 0)
              
              if (total === 0) {
                return <p className="text-gray-400 text-center py-8">No hay datos para mostrar</p>
              }
              
              const ancho = 300
              const alto = 300
              const centroX = ancho / 2
              const centroY = alto / 2
              const radio = 100
              
              let anguloInicio = -90 // Empezar desde arriba
              interface Segmento {
                pathData: string
                color: string
                nombre: string
                cantidad: number
                porcentaje: string
                xTexto: number
                yTexto: number
                anguloMedio: number
              }
              const segmentos: Segmento[] = []
              
              datos.forEach((item) => {
                const porcentaje = (item.cantidad / total) * 100
                const angulo = (porcentaje / 100) * 360
                const anguloFin = anguloInicio + angulo
                
                // Convertir a radianes
                const inicioRad = (anguloInicio * Math.PI) / 180
                const finRad = (anguloFin * Math.PI) / 180
                
                // Calcular puntos para el arco
                const x1 = centroX + radio * Math.cos(inicioRad)
                const y1 = centroY + radio * Math.sin(inicioRad)
                const x2 = centroX + radio * Math.cos(finRad)
                const y2 = centroY + radio * Math.sin(finRad)
                
                // Determinar si es un arco grande (>180 grados)
                const largeArcFlag = angulo > 180 ? 1 : 0
                
                const pathData = [
                  `M ${centroX} ${centroY}`,
                  `L ${x1} ${y1}`,
                  `A ${radio} ${radio} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ')
                
                // Ángulo medio para el texto
                const anguloMedio = (anguloInicio + anguloFin) / 2
                const anguloMedioRad = (anguloMedio * Math.PI) / 180
                const radioTexto = radio * 0.7
                const xTexto = centroX + radioTexto * Math.cos(anguloMedioRad)
                const yTexto = centroY + radioTexto * Math.sin(anguloMedioRad)
                
                segmentos.push({
                  pathData,
                  color: item.color,
                  nombre: item.nombre,
                  cantidad: item.cantidad,
                  porcentaje: porcentaje.toFixed(1),
                  xTexto,
                  yTexto,
                  anguloMedio
                })
                
                anguloInicio = anguloFin
              })
              
              return (
                <div className="relative">
                  <svg width={ancho} height={alto} className="w-full mx-auto" viewBox={`0 0 ${ancho} ${alto}`}>
                    {segmentos.map((seg, index) => (
                      <g key={index} className="group cursor-pointer">
                        <path
                          d={seg.pathData}
                          fill={seg.color}
                          stroke="#1F2937"
                          strokeWidth="2"
                          className="transition-all duration-300 hover:opacity-80"
                          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}
                        />
                        {parseFloat(seg.porcentaje) > 5 && (
                          <text
                            x={seg.xTexto}
                            y={seg.yTexto}
                            fill="white"
                            fontSize="12"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="pointer-events-none"
                          >
                            {seg.porcentaje}%
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                  
                  {/* Leyenda */}
                  <div className="mt-6 space-y-2">
                    {datos.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-gray-300">{item.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{item.cantidad}</span>
                          <span className="text-gray-500 text-xs">
                            ({((item.cantidad / total) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-700 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Total</span>
                        <span className="text-white font-bold">{total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

