'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function TestDatabasePage() {
  const [testResults, setTestResults] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [manualUserId, setManualUserId] = useState('')

  useEffect(() => {
    // Try to get user_id from localStorage
    const storedUserId = localStorage.getItem('user_id')
    if (storedUserId) {
      setUserId(storedUserId)
    }
  }, [])

  const runTests = async () => {
    setLoading(true)
    setTestResults([])
    setError(null)

    try {
      addResult('🏁 Iniciando pruebas de base de datos...')

      // Test 1: Verificar conexión a Supabase
      addResult('🔌 Probando conexión a Supabase...')
      const { error: connectionError } = await supabase
        .from('personal_data')
        .select('count(*)', { count: 'exact' })
        .limit(1)

      if (connectionError) {
        throw new Error(`Error de conexión: ${connectionError.message}`)
      }
      
      addResult('✅ Conexión a Supabase establecida correctamente')

      // Test 2: Verificar existencia de tablas
      addResult('📋 Verificando estructura de tablas...')
      const tables = ['personal_data', 'user_responses', 'user_columnar_responses', 'results_test']
      
      for (const table of tables) {
        const { count, error: tableError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (tableError) {
          addResult(`❌ Error al verificar tabla ${table}: ${tableError.message}`)
        } else {
          addResult(`✅ Tabla ${table} existe y contiene ${count} registros`)
        }
      }

      // Test 3: Insertar datos de prueba en formato columnar si se proporciona un ID
      const testUserId = manualUserId || userId
      
      if (testUserId) {
        addResult(`🧪 Probando inserción en user_columnar_responses para usuario ID: ${testUserId}...`)
        
        // Crear datos de prueba para 3 preguntas
        const testData = {
          user_id: parseInt(testUserId),
          pregunta_1: 3,
          pregunta_2: 4,
          pregunta_3: 5,
          updated_at: new Date().toISOString()
        }
        
        // Verificar si ya existe un registro para este usuario
        const { data: existingData, error: checkError } = await supabase
          .from('user_columnar_responses')
          .select('user_id')
          .eq('user_id', testUserId)
          .single()
          
        if (checkError && checkError.code !== 'PGRST116') {
          addResult(`❌ Error al verificar existencia de usuario: ${checkError.message}`)
        }
        
        let result
        if (!existingData) {
          // Insertar nuevo registro
          result = await supabase
            .from('user_columnar_responses')
            .insert(testData)
            .select()
          
          addResult(`${result.error ? '❌' : '✅'} Inserción de nuevo registro: ${result.error ? result.error.message : 'Exitosa'}`)
        } else {
          // Actualizar registro existente
          result = await supabase
            .from('user_columnar_responses')
            .update(testData)
            .eq('user_id', testUserId)
            .select()
          
          addResult(`${result.error ? '❌' : '✅'} Actualización de registro existente: ${result.error ? result.error.message : 'Exitosa'}`)
        }
        
        if (result.data) {
          addResult(`📊 Datos guardados: ${JSON.stringify(result.data)}`)
        }
        
        // Verificar que los datos se guardaron correctamente
        const { data: verificationData, error: verificationError } = await supabase
          .from('user_columnar_responses')
          .select('pregunta_1, pregunta_2, pregunta_3')
          .eq('user_id', testUserId)
          .single()
        
        if (verificationError) {
          addResult(`❌ Error al verificar datos guardados: ${verificationError.message}`)
        } else {
          addResult(`✅ Verificación de datos: ${JSON.stringify(verificationData)}`)
        }
      } else {
        addResult('⚠️ No se proporcionó un ID de usuario para pruebas de inserción')
      }

      addResult('🏁 Pruebas completadas')

    } catch (error) {
      setError(`Error en las pruebas: ${error.message}`)
      addResult(`❌ Error general: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const addResult = (message) => {
    setTestResults(prev => [...prev, message])
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Pruebas de Base de Datos</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <p className="text-gray-700 mb-2">Esta página permite probar la conexión y operaciones con la base de datos.</p>
        <p className="text-gray-700">Útil para diagnosticar problemas con la estructura columnar.</p>
      </div>
      
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID de usuario para pruebas
          </label>
          <input
            type="text"
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ingresa un ID de usuario"
          />
          <p className="text-xs text-gray-500 mt-1">
            {userId ? `ID en localStorage: ${userId}` : 'No hay ID en localStorage'}
          </p>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={runTests}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ejecutando...' : 'Ejecutar Pruebas'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="font-medium">Resultados de Pruebas</h2>
        </div>
        
        <div className="p-4 max-h-96 overflow-y-auto font-mono text-sm">
          {testResults.length > 0 ? (
            testResults.map((result, index) => (
              <div key={index} className="py-1">
                {result}
              </div>
            ))
          ) : (
            <p className="text-gray-500">Ejecuta las pruebas para ver los resultados aquí.</p>
          )}
        </div>
      </div>
    </div>
  )
}
