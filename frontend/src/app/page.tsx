'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Pregunta = {
  id: number
  texto: string
  eneatipo_asociado: number
  orden: number
}

type ResponseData = {
  user_id: number;
  pregunta_id: number;
  respuesta: number;
}

type PuntajesType = { [key: number]: number }
type ResultadoCalculado = {
  eneatipo: number;
  ala: number;
  confianza: number;
}

const opcionesTexto = ['Casi nunca', 'Rara vez cierto', 'Algo cierto', 'Generalmente cierto', 'Muy cierto']

export default function Home() {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [respuestas, setRespuestas] = useState<{ [id: number]: number }>({})
  const [pagina, setPagina] = useState(0)
  const [userId, setUserId] = useState<string>('')
  const [startTime] = useState(Date.now())
  const router = useRouter()

  const preguntasPorPagina = 10
  const totalPaginas = Math.ceil(preguntas.length / preguntasPorPagina)

  useEffect(() => {
    const storedRespuestas = localStorage.getItem('respuestas')
    const storedPagina = localStorage.getItem('pagina')
    if (storedRespuestas) setRespuestas(JSON.parse(storedRespuestas))
    if (storedPagina) setPagina(Number(storedPagina))
  }, [])

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    
    if (!storedUserId) {
      console.log('No se encontró user_id, redirigiendo a datos personales...');
      router.push('/datos-personales');
      return;
    }

    setUserId(storedUserId);
  }, [router]);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase
        .from('personal_data')
        .select('user_id')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        console.log('Usuario no encontrado en BD, redirigiendo...')
        router.push('/datos-personales')
        return
      }
    }

    if (userId) {
      checkUser()
    }
  }, [router, userId])

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

  const handleChange = (id: number, valor: number) => {
    setRespuestas((prev) => ({
      ...prev,
      [id]: valor,
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
    const preguntasPagina = preguntasActuales.map((p) => p.id)
    const sinResponder = preguntasPagina.some((id) => !respuestas[id])

    if (sinResponder) {
      alert('Por favor responde todas las preguntas antes de continuar.')
      return
    }

    setPagina((prev) => prev + 1)
  }

  const handleEnviar = async () => {
    try {
      if (!userId) {
        alert('Error: No se encontró el ID de usuario')
        router.push('/datos-personales')
        return
      }

      const todasRespondidas = preguntas.every(p => respuestas[p.id])
      if (!todasRespondidas) {
        alert('Debes responder todas las preguntas antes de enviar el test.')
        return
      }

      const userIdNum = parseInt(userId)
      const responsesData: ResponseData[] = preguntas.map((p) => ({
        user_id: userIdNum,
        pregunta_id: p.id,
        respuesta: respuestas[p.id]
      }))

      const { error: responsesError } = await supabase
        .from('responses_test')
        .insert(responsesData)

      if (responsesError) {
        throw responsesError
      }

      // Calcular puntajes por eneatipo
      const puntajes: PuntajesType = {}
      preguntas.forEach((p) => {
        const valor = respuestas[p.id]
        if (valor) {
          puntajes[p.eneatipo_asociado] = (puntajes[p.eneatipo_asociado] || 0) + valor
        }
      })

      // Calcular resultado
      const resultado = calcularResultado(puntajes)

      const { error: resultsError } = await supabase
        .from('results_test')
        .update({
          eneatipo_resultado: resultado.eneatipo,
          ala_resultado: resultado.ala,
          confianza: resultado.confianza,
          puntajes: puntajes,
          duracion_test: Math.floor((Date.now() - startTime) / 1000)
        })
        .eq('user_id', userIdNum)
        .single()

      if (resultsError) {
        throw resultsError
      }

      localStorage.removeItem('respuestas')
      localStorage.removeItem('pagina')
      router.push('/resultado')

    } catch (error) {
      console.error('Error detallado:', error)
      alert('Hubo un error al guardar tus respuestas. Por favor, intenta de nuevo.')
    }
  }

  const calcularResultado = (puntajes: PuntajesType): ResultadoCalculado => {
    // Encontrar el eneatipo con mayor puntaje
    const eneatipo = Object.entries(puntajes)
      .sort(([,a], [,b]) => b - a)[0][0]

    // Calcular ala (segundo puntaje más alto adyacente)
    const eneatipoNum = parseInt(eneatipo)
    const posiblesAlas = [
      eneatipoNum === 1 ? 9 : eneatipoNum - 1,
      eneatipoNum === 9 ? 1 : eneatipoNum + 1
    ]
    
    const ala = posiblesAlas.reduce((a, b) => 
      (puntajes[a] || 0) > (puntajes[b] || 0) ? a : b
    )

    // Calcular confianza (0-100) basado en la diferencia con otros puntajes
    const puntajeMaximo = puntajes[eneatipoNum]
    const otrosPuntajes = Object.values(puntajes).filter(p => p !== puntajeMaximo)
    const promedioPuntajes = otrosPuntajes.reduce((a, b) => a + b, 0) / otrosPuntajes.length
    const confianza = Math.min(100, Math.round((puntajeMaximo - promedioPuntajes) * 10))

    return { eneatipo: eneatipoNum, ala, confianza }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-pink-100 border border-pink-300 rounded-xl p-4">
        <h1 className="text-3xl font-bold mb-2">🧠 Test LudIA</h1>
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
        <div key={p.id} className="p-4 border rounded-xl shadow-sm bg-white space-y-2">
          <p className="font-medium">{p.texto}</p>
          <div className="flex flex-col gap-2">
            {opcionesTexto.map((texto, idx) => (
              <label key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${p.id}`}  // Convert to string
                  value={`${idx + 1}`}  // Convert to string
                  checked={respuestas[p.id] === idx + 1}
                  onChange={() => handleChange(p.id, idx + 1)}
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
          className="bg-gray-200 dark:bg-gray-700 
             text-gray-900 dark:text-white 
             px-4 py-2 rounded 
             hover:bg-gray-300 dark:hover:bg-gray-600 
             disabled:opacity-50"
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
            const autoRespuestas: { [id: number]: number } = {}
            preguntas.forEach((p) => {
              autoRespuestas[p.id] = Math.floor(Math.random() * 4) + 1
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