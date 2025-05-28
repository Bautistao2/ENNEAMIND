'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis as PolarAngleAxisType,
  PolarRadiusAxis as PolarRadiusAxisType,
  Tooltip as TooltipType,
  ResponsiveContainer,
  Radar as RadarType,
} from 'recharts'

// Definir el tipo para la estructura columnar
type UserColumnarResponsesData = {
  user_id: number;
  [key: string]: any; // Para las columnas de preguntas dinámicas
  eneatipo_resultado: number | null;
  ala_resultado: number | null;
}

const PolarAngleAxis = PolarAngleAxisType as any;
const PolarRadiusAxis = PolarRadiusAxisType as any;
const Radar = RadarType as any;
const Tooltip = TooltipType as any;

const descripciones: { [key: number]: string } = {
  1: '🧭 El Reformador: Es el justiciero interior que llevamos dentro. Tiene una brújula moral que nunca falla (aunque a veces se pase de estricta). Perfeccionista profesional, amante del orden y las reglas. Si algo está fuera de lugar, él lo ve. ¡Y sufre! Sueña con un mundo más justo… y con una casa impecable.',
  
  2: '💖 El Ayudador: El alma del grupo, el que llega con sopa cuando estás enfermo (aunque no la hayas pedido). Vive para dar, ayudar, cuidar, mimar… y recibir cariño a cambio. Le encanta sentirse necesitado. Su frase favorita: "¿Quieres que te ayude con eso?".',

  3: '🏆 El Triunfador: El Cristiano Ronaldo del eneagrama. Siempre buscando ser el número uno, destacar, brillar. Ambicioso, elegante y con más metas que pestañas tiene un ciempiés. Todo lo convierte en logro… incluso dormir 8 horas puede ser un check de productividad.',

  4: '🎨 El Individualista: Un alma artística con WiFi directo al corazón. Vive intensamente sus emociones (y las de los demás). Le gusta ser único, especial, diferente. A veces es drama queen, a veces poeta, siempre auténtico. Si tuviera un lema sería: "Siento, luego existo".',

  5: '🧠 El Investigador: El sabio del grupo. Está en su cueva mental investigando, analizando y observando el universo. Le gusta entender TODO, pero con distancia emocional, por favor. Introvertido de manual, tiene la batería social de un Nokia, pero la memoria de una nube.',

  6: '🛡️ El Leal: El guardián del castillo. Leal hasta la médula, protector de su gente. Siempre preparado para lo peor (aunque esté todo bien). Un poco paranoico, muy comprometido. Si pudiera tener un superpoder, sería el de anticipar todos los peligros... por si acaso.',

  7: '🎉 El Entusiasta: Una fiesta andante. Energía infinita, ideas por mil, agenda llena. Odia aburrirse, ama vivir mil aventuras al mismo tiempo. Sabe 3 idiomas y 47 hobbies, aunque no termina ninguno. Es alegría pura… y un poquito disperso también.',

  8: '🔥 El Desafiador: El líder nato. Intenso, fuerte, protector. No se anda con rodeos. Si ve injusticia, entra como toro en cacharrería. Tiene un corazón enorme, pero bien escondido detrás de su armadura de acero inoxidable. Respeto primero, cariño después.',

  9: '🌿 El Pacificador: El zen del grupo. Tranquilo, relajado, adaptable. Le gusta que todos estén bien (incluyendo su perrito, su planta y su vecino ruidoso). Le cuesta decir "no" y ama una buena siesta. Si pudiera, resolvería todos los conflictos con un abrazo y un té.',
};

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

        // Obtener datos de la tabla columnar
        const { data: columnarData, error: columnarError } = await supabase
          .from('user_columnar_responses')
          .select('*')  // Seleccionamos todos los campos
          .eq('user_id', userId)
          .single();
        
        if (columnarData && !columnarError) {
          console.log('✅ Datos encontrados en user_columnar_responses');
          setEneatipo(columnarData.eneatipo_resultado);
          setAla(columnarData.ala_resultado);
          
          // Calcular puntajes a partir de las respuestas
          if (!columnarData.eneatipo_resultado) {
            console.log('⚠️ Eneatipo no calculado aún');
          } else {
            // Necesitamos consultar las preguntas para obtener los eneatipos asociados a cada una
            const { data: preguntas, error: preguntasError } = await supabase
              .from('questions_test')
              .select('id, eneatipo_asociado');
            
            if (preguntasError) {
              console.error('❌ Error al cargar preguntas:', preguntasError);
              return;
            }
            
            // Convertir respuestas a formato de puntajes para el gráfico radar
            const puntajesPorEneatipo: { [key: string]: number } = {};

            // Iterar sobre cada columna de pregunta en el resultado
            Object.entries(columnarData).forEach(([campo, valor]) => {
              // Comprobar si el campo es una columna de pregunta
              if (campo.startsWith('pregunta_') && valor !== null && typeof valor === 'number') {
                const preguntaId = parseInt(campo.replace('pregunta_', ''));
                
                // Encontrar la pregunta correspondiente
                const pregunta = preguntas.find(p => p.id === preguntaId);
                if (pregunta) {
                  const eneatipoAsociado = pregunta.eneatipo_asociado.toString();
                  // Sumar el valor al puntaje del eneatipo correspondiente
                  puntajesPorEneatipo[eneatipoAsociado] = (puntajesPorEneatipo[eneatipoAsociado] || 0) + valor;
                }
              }
            });
            
            setPuntajes(puntajesPorEneatipo);
          }
          return;
        }
        
        // Si no hay datos en ninguna tabla
        console.log('⚠️ No se encontraron datos en user_columnar_responses');
        setError('No se encontraron resultados para este usuario')

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
      <h1 className="text-3xl font-bold text-center">🎯 Basado en tus respuestas</h1>

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
            <p className="text-3xl font-bold text-pink-600">Eneatipo {eneatipo}</p>
            <div className="h-8"></div> {/* Div espaciador de 2rem (32px) */}
            <p className="text-gray-600 italic">{descripciones[eneatipo]}</p>
          </div>
            <div className="h-7"></div> {/* Div espaciador de 2rem (32px) */}
          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">El ala es el número vecino a tu tipo principal en el eneagrama que le da un toque de sabor extra a tu personalidad. 🎨 Es como ser tú mismo, ¡pero con condimentos! 🌶️:</h2>
          </div>  
          <div className="h-8"></div> {/* Div espaciador de 2rem (32px) */}
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white">Ala {ala}</p>
            <p className="text-gray-600 dark:text-gray-300 italic">{descripciones[ala]}</p>
          </div>

          {/* Gráfico Radar */}
          {radarData.length > 0 && (
            <div className="mt-8 bg-gray-50 dark:bg-gray-800 border rounded-xl p-4 shadow-inner">
              <h3 className="text-center font-semibold mb-4 text-gray-800 dark:text-black">
                Visualización de tus puntajes por eneatipo
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData} animationDuration={800}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="eneatipo" fontSize={12} />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, maxValor]} 
                    tickCount={6}
                    fontSize={10}  // Reducido de 8 a 6
                    tick={{ 
                      position: 'inside',
                      offset: -5,  // Mover números más hacia dentro
                      fill: '#666' // Color más suave
                    }}
                    axisLine={false}
                    tickLine={false}
                    scale="linear"  // Asegurar escala lineal
                    orientation="left" // Orientación hacia la izquierda
                  />
                  <Radar
                    name="Puntaje"
                    dataKey="puntaje"
                    stroke="#db2777"
                    fill="#f472b6"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [`Puntaje: ${value}`, name]}
                    wrapperStyle={{ 
                      backgroundColor: '#ffffff', // Fondo blanco fijo
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    contentStyle={{
                      color: '#000000', // Texto negro fijo
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                    cursor={{ stroke: '#db2777' }}
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
