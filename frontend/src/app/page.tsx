'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

interface TestResults {
  eneatipo_resultado: number | null;
  ala_resultado: number | null;
  confianza: number;
  puntajes: { [key: number]: number };
  duracion_test: number;
}

type Pregunta = {
  id: number
  codigo: string
  texto: string
  eneatipo_asociado: number
  orden: number
}

const opcionesTexto = ['Rara vez', 'Algo cierto', 'Generalmente cierto', 'Muy cierto']

export default function Home() {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [respuestas, setRespuestas] = useState<{ [codigo: string]: number }>({})
  const [pagina, setPagina] = useState(0)
  const [userId, setUserId] = useState<string>('')
  const [startTime] = useState(Date.now())
  const router = useRouter()

  const preguntasPorPagina = 10
  const totalPaginas = Math.ceil(preguntas.length / preguntasPorPagina)

  useEffect(() => {
    const storedRespuestas = localStorage.getItem('respuestas')
    const storedPagina = localStorage.getItem('pagina')
    const storedUserId = localStorage.getItem('user_id')

    if (storedRespuestas) setRespuestas(JSON.parse(storedRespuestas))
    if (storedPagina) setPagina(Number(storedPagina))

    if (!storedUserId) {
      console.log('No se encontró user_id, redirigiendo a datos personales...')
      router.push('/datos-personales')
      return
    }
    setUserId(storedUserId)

    // Verificar si el usuario existe en la base de datos
    const checkUser = async () => {
      const { data, error } = await supabase
        .from('personal_data')
        .select('user_id')
        .eq('user_id', storedUserId)
        .single()

      if (error || !data) {
        console.log('Usuario no encontrado en BD, redirigiendo...')
        router.push('/datos-personales')
        return
      }
    }

    checkUser()
  }, [router])

  useEffect(() => {
    localStorage.setItem('respuestas', JSON.stringify(respuestas))
  }, [respuestas])

  useEffect(() => {
    localStorage.setItem('pagina', pagina.toString())
  }, [pagina])

  useEffect(() => {
    const fetchPreguntas = async () => {
      const { data, error } = await supabase
        .from('questions_test')
        .select('*')
        .order('orden')

      if (error) {
        console.error('Error al cargar preguntas:', error)
      } else {
        setPreguntas(data)
      }
    }

    fetchPreguntas()
  }, [])

  const handleChange = (codigo: string, valor: number) => {
    setRespuestas((prev) => ({
      ...prev,
      [codigo]: valor,
    }))
  }

  const preguntasActuales = preguntas.slice(
    pagina * preguntasPorPagina,
    (pagina + 1) * preguntasPorPagina
  )

  const progreso = Math.round(
    (Object.keys(respuestas).length / preguntas.length) * 100
  )

  const handleSiguiente = () => {
    const preguntasPagina = preguntasActuales.map((p) => p.codigo)
    const sinResponder = preguntasPagina.some((codigo) => !respuestas[codigo])

    if (sinResponder) {
      alert('Por favor responde todas las preguntas antes de continuar.')
      return
    }

    setPagina((prev) => prev + 1)
  }

  const handleEnviar = async () => {
    try {
      if (!userId) {
        console.error('No se encontró user_id')
        router.push('/datos-personales')
        return
      }

      // 1. Verificar respuestas completas
      const todasRespondidas = preguntas.every(p => respuestas[p.codigo])
      if (!todasRespondidas) {
        alert('Debes responder todas las preguntas antes de enviar el test.')
        return
      }

      // 2. Calcular puntajes con más detalle
      const puntajes: { [key: number]: number } = {}
      let totalRespuestas = 0
      
      preguntas.forEach((p) => {
        const valor = respuestas[p.codigo]
        if (valor) {
          puntajes[p.eneatipo_asociado] = (puntajes[p.eneatipo_asociado] || 0) + valor
          totalRespuestas++
        }
      })

      // 3. Calcular eneatipo y ala con validación
      const ordenados = Object.entries(puntajes)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => ({ eneatipo: Number(key), puntaje: value }))

      const eneatipo = ordenados[0]?.eneatipo
      const ala = ordenados[1]?.eneatipo

      // Calcular confianza basada en la diferencia de puntajes
      const confianza = ordenados[0] && ordenados[1] 
        ? Math.min(1, (ordenados[0].puntaje - ordenados[1].puntaje) / 10)
        : 0

      console.log('Resultados calculados:', {
        puntajes,
        eneatipo,
        ala,
        confianza,
        totalRespuestas
      })

      // 4. Guardar primero las respuestas individuales
      const { error: responsesError } = await supabase
        .from('responses_test')
        .insert(preguntas.map((p) => ({
          user_id: userId,
          pregunta_codigo: p.codigo,
          respuesta: respuestas[p.codigo],
        })))

      if (responsesError) {
        console.error('Error al guardar respuestas:', responsesError)
        throw responsesError
      }

      // 5. Usar update en lugar de upsert
      const { data: savedResult, error: resultsError } = await supabase
        .from('results_test')
        .update({
          eneatipo_resultado: eneatipo,
          ala_resultado: ala,
          confianza: confianza,
          puntajes: puntajes,
          duracion_test: Math.floor((Date.now() - startTime) / 1000)
        })
        .eq('user_id', userId)
        .select()

      if (resultsError) {
        console.error('Error al guardar resultados:', resultsError)
        throw resultsError
      }

      console.log('Resultados guardados:', savedResult)

      // 6. Limpiar y redireccionar
      localStorage.removeItem('respuestas')
      localStorage.removeItem('pagina')
      router.push('/resultado')

    } catch (error) {
      console.error('Error detallado:', error)
      alert('Hubo un error al guardar tus respuestas. Por favor, intenta de nuevo.')
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-pink-100 border border-pink-300 rounded-xl p-4">
        <h1 className="text-3xl font-bold mb-2">🧠 Test EnneaMind</h1>
        <p className="text-gray-700">
          Responde con sinceridad cada afirmación. Elige la opción que más se
          acerque a cómo te sientes normalmente.
        </p>
      </div>

      <div className="sticky top-0 z-50 bg-white py-2">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-pink-500 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {preguntasActuales.map((p) => (
        <div key={p.codigo} className="p-4 border rounded-xl shadow-sm bg-white space-y-2">
          <p className="font-medium">{p.texto}</p>
          <div className="flex flex-col gap-2">
            {opcionesTexto.map((texto, idx) => (
              <label key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={p.codigo}
                  value={idx + 1}
                  checked={respuestas[p.codigo] === idx + 1}
                  onChange={() => handleChange(p.codigo, idx + 1)}
                />
                {texto}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-between items-center mt-6">
        <button
          disabled={pagina === 0}
          onClick={() => setPagina((prev) => prev - 1)}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          ← Anterior
        </button>

        <span className="text-sm text-gray-600">
          Página {pagina + 1} de {totalPaginas}
        </span>

        {pagina === totalPaginas - 1 ? (
          <button
            onClick={handleEnviar}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Enviar Test
          </button>
        ) : (
          <button
            onClick={handleSiguiente}
            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
          >
            Siguiente →
          </button>
        )}
      </div>

      {/* Botón temporal para pruebas automáticas */}
      <div className="text-center">
        <button
          onClick={() => {
            const autoRespuestas: { [codigo: string]: number } = {}
            preguntas.forEach((p) => {
              autoRespuestas[p.codigo] = Math.floor(Math.random() * 4) + 1
            })
            setRespuestas(autoRespuestas)
            setTimeout(() => handleEnviar(), 1000)
          }}
          className="mt-10 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          🧪 AUTOTEST (llenar y enviar)
        </button>
      </div>
    </main>
  )
}