'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis as PolarAngleAxisType,
  PolarRadiusAxis as PolarRadiusAxisType,
  Tooltip as TooltipType,
  ResponsiveContainer,
  Radar as RadarType,
} from 'recharts'

const PolarAngleAxis = PolarAngleAxisType as any;
const PolarRadiusAxis = PolarRadiusAxisType as any;
const Radar = RadarType as any;
const Tooltip = TooltipType as any;

const descripciones: { [key: number]: string } = {
  1: 'El Reformador: Ético, dedicado, y confiable. Tiene un fuerte sentido del bien y del mal.',
  2: 'El Ayudador: Cariñoso, complaciente y generoso. Necesita ser amado.',
  3: 'El Triunfador: Adaptable, sobresaliente, motivado. Necesita tener éxito.',
  4: 'El Individualista: Sensible, introspectivo, emocionalmente honesto.',
  5: 'El Investigador: Perceptivo, innovador, reservado. Busca comprender el mundo.',
  6: 'El Leal: Comprometido, responsable, ansioso. Busca seguridad.',
  7: 'El Entusiasta: Spontáneo, versátil, extrovertido. Evita el dolor.',
  8: 'El Desafiador: Seguro de sí mismo, fuerte, protector. Le importa la justicia.',
  9: 'El Pacificador: Agradable, complaciente, evita conflictos. Busca armonía.',
}

export default function ResultadoPage() {
  const [eneatipo, setEneatipo] = useState<number | null>(null)
  const [ala, setAla] = useState<number | null>(null)
  const [puntajes, setPuntajes] = useState<{ [key: string]: number }>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResultado = async () => {
      try {
        // Verificar conexión Supabase
        const { error: connectionError } = await supabase.from('results_test').select('count').limit(1)
        
        if (connectionError) {
          console.error('❌ Error de conexión con Supabase:', connectionError)
          setError('Error de conexión con la base de datos')
          return
        }

        let userId = localStorage.getItem('user_id')
        if (!userId) {
          setError('No se encontró identificación de usuario')
          return
        }

        if (userId.includes(':')) {
          userId = userId.split(':')[0]
        }

        console.log('🔍 Buscando resultados para userId:', userId)

        const { data, error } = await supabase
          .from('results_test')
          .select('eneatipo_resultado, ala_resultado, puntajes')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          console.error('❌ Error completo:', JSON.stringify(error, null, 2))
          setError(`Error al cargar datos: ${error.message}`)
          return
        }

        if (!data) {
          setError('No se encontraron resultados para este usuario')
          return
        }

        setEneatipo(data.eneatipo_resultado)
        setAla(data.ala_resultado)
        setPuntajes(data.puntajes || {})
        setError(null)
      } catch (err) {
        console.error('❌ Error inesperado:', err)
        setError('Ocurrió un error inesperado')
      }
    }

    fetchResultado()
  }, [])

  const radarData = Object.entries(puntajes).map(([key, value]) => ({
    eneatipo: descripciones[parseInt(key)].split(':')[0],
    puntaje: value,
  }))

  const maxValor = Math.max(...Object.values(puntajes), 60)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">🎯 Tu Perfil EnneaMind</h1>

      {error ? (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
          <p className="text-red-600">{error}</p>
          <button
            className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
            onClick={() => window.location.href = '/'}
          >
            Volver al inicio
          </button>
        </div>
      ) : eneatipo && ala ? (
        <div className="bg-white p-6 rounded-xl shadow space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700">Eneatipo dominante:</h2>
            <p className="text-5xl font-bold text-pink-600">Eneatipo {eneatipo}</p>
            <p className="text-gray-600 italic">{descripciones[eneatipo]}</p>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-700">Ala:</h2>
            <p className="text-3xl font-bold text-gray-800">Ala {ala}</p>
            <p className="text-gray-600 italic">{descripciones[ala]}</p>
          </div>

          {/* Gráfico Radar */}
          {radarData.length > 0 && (
            <div className="mt-8 bg-gray-50 border rounded-xl p-4 shadow-inner">
              <h3 className="text-center font-semibold mb-4">Visualización de tus puntajes por eneatipo</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData} animationDuration={800}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="eneatipo" fontSize={10} />
                  <PolarRadiusAxis angle={90} domain={[0, maxValor]} tickCount={6} />
                  <Radar
                    name="Puntaje"
                    dataKey="puntaje"
                    stroke="#db2777"
                    fill="#f472b6"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [`Puntaje: ${value}`, name]}
                    wrapperStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-center">
            <button
              className="mt-6 bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600"
              onClick={() => {
                localStorage.clear()
                window.location.href = '/'
              }}
            >
              Volver a realizar el test
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">Cargando resultado...</p>
      )}
    </main>
  )
}
