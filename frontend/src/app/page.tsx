'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

type Pregunta = {
  id: number
  texto: string
  eneatipo_asociado: number
  orden: number
}

type PuntajesType = { [key: number]: number }
type ResultadoCalculado = {
  eneatipo: number;
  ala: number;
  confianza: number;
}

// Definir tipo para errores de Supabase
type SupabaseError = {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
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
      console.log('Iniciando envío de respuestas...');
      
      if (!userId) {
        alert('Error: No se encontró el ID de usuario')
        router.push('/datos-personales')
        return
      }

      console.log('ID de usuario encontrado:', userId);
      
      const todasRespondidas = preguntas.every(p => respuestas[p.id])
      if (!todasRespondidas) {
        alert('Debes responder todas las preguntas antes de enviar el test.')
        return
      }

      console.log('Todas las preguntas respondidas. Total de respuestas:', Object.keys(respuestas).length);

      const userIdNum = parseInt(userId)
      
      // Preparar los datos para la estructura columnar
      console.log('Preparando datos para guardado...');
      
      // Crear un objeto simple con solo las preguntas y valores
      const simpleColumnarData: { [key: string]: number } = {};
      Object.entries(respuestas).forEach(([preguntaId, valor]) => {
        // Asegurarse que los valores sean números enteros
        simpleColumnarData[`pregunta_${preguntaId}`] = parseInt(valor.toString());
      });
      
      console.log('Datos columnar simplificados:', simpleColumnarData);

      // Verificar si ya existe un registro en la tabla columnar
      const { data: existingColumnarData, error: checkColumnarError } = await supabase
        .from('user_columnar_responses')
        .select('user_id')
        .eq('user_id', userIdNum)
        .single()

      if (checkColumnarError && checkColumnarError.code !== 'PGR4011') {
        throw checkColumnarError
      }

      // Insertar o actualizar en la tabla columnar
      let columnarResponseError;
      
      if (!existingColumnarData) {
        // No existe, insertar nuevo registro con user_id y las columnas de preguntas
        const insertData = { 
          user_id: userIdNum, 
          ...simpleColumnarData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('Insertando nuevo registro en user_columnar_responses:', insertData);
        
        const { data: insertedData, error } = await supabase
          .from('user_columnar_responses')
          .insert([insertData])
          .select()
        
        if (error) {
          columnarResponseError = error;
          console.error('Error al insertar en user_columnar_responses:', error);
          console.error('SQL error code:', error.code);
          console.error('SQL error hint:', error.hint);
          console.error('SQL error details:', error.details);
        } else {
          console.log('Insertado con éxito en user_columnar_responses:', insertedData);
        }
      } else {
        // Ya existe, actualizar solo las columnas de preguntas
        const updateData = {
          ...simpleColumnarData,
          updated_at: new Date().toISOString()
        };
        console.log('Actualizando registro existente en user_columnar_responses con:', updateData);
        
        const { data: updatedData, error } = await supabase
          .from('user_columnar_responses')
          .update(updateData)
          .eq('user_id', userIdNum)
          .select()
        
        if (error) {
          columnarResponseError = error;
          console.error('Error al actualizar en user_columnar_responses:', error);
          console.error('SQL error code:', error.code);
          console.error('SQL error hint:', error.hint);
          console.error('SQL error details:', error.details);
        } else {
          console.log('Actualizado con éxito en user_columnar_responses:', updatedData);
        }
      }

      if (columnarResponseError) {
        console.error('Error al guardar en formato columnar:', columnarResponseError);
        console.error('Datos que se intentaron guardar:', JSON.stringify(simpleColumnarData, null, 2));
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

      // Actualizar la tabla columnar con los resultados
      const { data: updatedColumnarData, error: updateColumnarError } = await supabase
        .from('user_columnar_responses')
        .update({
          eneatipo_resultado: resultado.eneatipo,
          ala_resultado: resultado.ala,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userIdNum)
        .select()
      
      if (updateColumnarError) {
        console.error('Error al actualizar resultados en tabla columnar:', updateColumnarError);
        console.error('SQL error code:', updateColumnarError.code);
        console.error('SQL error hint:', updateColumnarError.hint);
        console.error('SQL error details:', updateColumnarError.details);
      } else {
        console.log('Resultados actualizados con éxito en tabla columnar:', updatedColumnarData);
      }

      // Mantener también la actualización en results_test para compatibilidad
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
      // Mostrar más información sobre el error
      if (error instanceof Error) {
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      // Verificar si el error es de Supabase
      const supabaseError = error as SupabaseError;
      if (supabaseError?.code || supabaseError?.details || supabaseError?.hint) {
        console.error('Error de Supabase:');
        console.error('- Código:', supabaseError.code);
        console.error('- Detalles:', supabaseError.details);
        console.error('- Sugerencia:', supabaseError.hint);
        console.error('- Mensaje:', supabaseError.message);
      }
      
      alert('Hubo un error al guardar tus respuestas. Por favor, intenta de nuevo. Revisa la consola para más detalles.')
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
          className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50"
        >
          ← Anterior
        </button>

        <span className="text-sm text-gray-600 dark:text-gray-300">
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