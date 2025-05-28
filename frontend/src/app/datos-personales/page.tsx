'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

// Comunidades autónomas de España
const COMUNIDADES_AUTONOMAS = [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
    'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
    'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
    'Navarra', 'País Vasco', 'Comunidad Valenciana'
];

const PROVINCIAS_POR_COMUNIDAD: { [key: string]: string[] } = {
    'Andalucía': ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
    'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
    'Asturias': ['Asturias'],
    'Baleares': ['Islas Baleares'],
    'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
    'Cantabria': ['Cantabria'],
    'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
    'Castilla y León': ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
    'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
    'Extremadura': ['Badajoz', 'Cáceres'],
    'Galicia': ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
    'La Rioja': ['La Rioja'],
    'Madrid': ['Madrid'],
    'Murcia': ['Murcia'],
    'Navarra': ['Navarra'],
    'País Vasco': ['Álava', 'Guipúzcoa', 'Vizcaya'],
    'Comunidad Valenciana': ['Alicante', 'Castellón', 'Valencia']
};

// Nivel educativo options
const NIVELES_EDUCATIVOS = [
    'Educación primaria',
    'Educación secundaria',
    'Bachillerato',
    'Formación profesional',
    'Universidad',
    'Postgrado/Máster',
    'Doctorado'
];

const SEXO_OPTIONS = [
    'Masculino',
    'Femenino',
    'No binario',
    'Prefiero no decirlo'
];

const DatosPersonales = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        edad: '',
        sexo: '',
        comunidadAutonoma: '',
        provincia: '',
        localidad: '',
        nivelesEducativos: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.edad || Number(formData.edad) < 10 || Number(formData.edad) > 90) {
            newErrors.edad = 'La edad debe estar entre 10 y 90 años';
        }

        if (!formData.sexo) {
            newErrors.sexo = 'Seleccione un sexo';
        }

        if (!formData.comunidadAutonoma) {
            newErrors.comunidadAutonoma = 'Seleccione una comunidad autónoma';
        }

        if (!formData.provincia) {
            newErrors.provincia = 'Seleccione una provincia';
        }

        if (!formData.localidad) {
            newErrors.localidad = 'Ingrese una localidad';
        } else if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñüÜ\s\-]{1,50}$/.test(formData.localidad)) {
            newErrors.localidad = 'La localidad solo puede contener letras, espacios y guiones';
        }

        if (!formData.nivelesEducativos) {
            newErrors.nivelesEducativos = 'Seleccione un nivel educativo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validateForm()) return;

        try {
            // 1. Insertar en personal_data (el ID se generará automáticamente)
            const { data: insertedData, error: personalDataError } = await supabase
                .from('personal_data')
                .insert({
                    edad: parseInt(formData.edad),
                    sexo: formData.sexo,
                    comunidad_autonoma: formData.comunidadAutonoma,
                    provincia: formData.provincia,
                    localidad: formData.localidad,
                    nivel_educativo: [formData.nivelesEducativos]
                })
                .select();

            if (personalDataError) {
                console.error('Error en personal_data:', personalDataError);
                throw personalDataError;
            }

            const userId = insertedData[0].user_id;
            console.log('Nuevo user_id generado:', userId);            // 2. Insertar en results_test (para compatibilidad)
            const { data: resultData, error: resultsError } = await supabase
                .from('results_test')
                .insert({
                    user_id: userId,
                    eneatipo_resultado: null,
                    ala_resultado: null,
                    confianza: null,
                    puntajes: null,
                    duracion_test: null
                })
                .select();

            if (resultsError) {
                console.error('Error en results_test:', resultsError);
                throw resultsError;
            }
              // 3. Insertar en nueva tabla columnar
            const { data: columnarData, error: columnarError } = await supabase
                .from('user_columnar_responses')
                .insert({
                    user_id: userId,
                    eneatipo_resultado: null,
                    ala_resultado: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select();

            if (columnarError) {
                console.error('Error al insertar en user_columnar_responses:', columnarError);
                console.error('SQL error code:', columnarError.code);
                console.error('SQL error hint:', columnarError.hint);
                console.error('SQL error details:', columnarError.details);
                // No lanzamos error para no interrumpir el flujo si falla solo la inserción en la tabla nueva
            } else {
                console.log('Datos insertados en user_columnar_responses:', columnarData);
            }

            console.log('Datos insertados en results_test:', resultData);

            // 3. Verificar que los datos se guardaron correctamente
            const { data: verificationData, error: verificationError } = await supabase
                .from('personal_data')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (verificationError) {
                console.error('Error al verificar datos:', verificationError);
                throw verificationError;
            }

            console.log('Verificación de datos guardados:', verificationData);

            // 4. Solo si todo está correcto, guardar en localStorage y redireccionar
            localStorage.setItem('user_id', userId);
            console.log('User ID guardado en localStorage:', userId);
            
            await router.push('/');
        } catch (error) {
            console.error('Error detallado al insertar datos:', error);
            setErrors(prev => ({
                ...prev,
                submit: 'Error al guardar los datos. Por favor, intenta de nuevo.'
            }));
            // No redireccionar si hay error
            return;
        }
    };

    return (
        // Contenedor principal con padding ajustado - actualizado para dark mode
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 dark:from-blue-950 dark:via-gray-900 dark:to-purple-950 p-4">
            {/* Contenedor del formulario con sombra y fondo */}
            <div className="max-w-2xl mx-auto bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-lg overflow-hidden">
                {/* Cabecera */}
                <div className="p-4 md:p-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-center mb-4">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                            📝 Datos Personales
                        </span>
                    </h1>
                    
                    <p className="text-gray-900 dark:text-black text-center mb-6 text-sm md:text-base">
                        Por favor, completa tus datos para comenzar el test
                    </p>
                </div>

                {/* Formulario con padding y espaciado */}
                <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6">
                    {/* Actualizar cada label y input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-black mb-2">
                            Edad
                        </label>
                        <input
                            type="number"
                            min="10"
                            max="90"
                            value={formData.edad}
                            onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-700 
                                     text-gray-900 dark:text-white
                                     rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ingresa tu edad"
                        />
                        {errors.edad && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.edad}</p>}
                    </div>

                    {/* Actualizar los selects */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-black mb-2">
                            Sexo
                        </label>
                        <select
                            value={formData.sexo}
                            onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-700 
                                     text-gray-900 dark:text-gray-100
                                     rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     dark:bg-gray-700 dark:text-gray-100
                                     [&>*]:dark:bg-gray-700 [&>*]:dark:text-gray-100"
                            style={{ colorScheme: 'light dark' }}
                        >
                            <option value="" className="bg-white dark:bg-gray-700">
                                Seleccione...
                            </option>
                            {SEXO_OPTIONS.map(option => (
                                <option key={option} value={option} className="bg-white dark:bg-gray-700">
                                    {option}
                                </option>
                            ))}
                        </select>
                        {errors.sexo && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.sexo}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-black mb-2">
                            Comunidad Autónoma
                        </label>
                        <select
                            value={formData.comunidadAutonoma}
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                comunidadAutonoma: e.target.value,
                                provincia: ''
                            })}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-700 
                                     text-gray-900 dark:text-gray-100
                                     rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     dark:bg-gray-700 dark:text-gray-100
                                     [&>*]:dark:bg-gray-700 [&>*]:dark:text-gray-100"
                            style={{ colorScheme: 'light dark' }}
                        >
                            <option value="">Seleccione una comunidad...</option>
                            {COMUNIDADES_AUTONOMAS.map((comunidad) => (
                                <option key={comunidad} value={comunidad} className="bg-white dark:bg-gray-700">
                                    {comunidad}
                                </option>
                            ))}
                        </select>
                        {errors.comunidadAutonoma && (
                            <p className="text-red-500 dark:text-red-400 text-sm mt-2">
                                {errors.comunidadAutonoma}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-black mb-2">Provincia</label>
                        <select
                            value={formData.provincia}
                            onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-700 
                                     text-gray-900 dark:text-gray-100
                                     rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!formData.comunidadAutonoma}
                        >
                            <option value="">Seleccione una provincia...</option>
                            {formData.comunidadAutonoma && 
                                PROVINCIAS_POR_COMUNIDAD[formData.comunidadAutonoma]?.map((provincia) => (
                                    <option key={provincia} value={provincia}>{provincia}</option>
                                ))
                            }
                        </select>
                        {errors.provincia && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.provincia}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-black mb-2">Localidad</label>
                        <input
                            type="text"
                            maxLength={50}
                            value={formData.localidad}
                            onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-700 
                                     text-gray-900 dark:text-white
                                     rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ingresa tu localidad"
                        />
                        {errors.localidad && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.localidad}</p>}
                    </div>

                    {/* Actualizar la sección de nivel educativo */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                        <label className="block text-sm font-medium text-gray-900 dark:text-black mb-4">
                            Nivel Educativo
                        </label>
                        <div className="grid md:grid-cols-2 gap-3">
                            {NIVELES_EDUCATIVOS.map((nivel) => (
                                <div key={nivel} 
                                     className="flex items-center space-x-3 p-2 
                                              hover:bg-gray-100 dark:hover:bg-gray-600 
                                              rounded-lg transition-colors duration-200">
                                    <input
                                        type="radio"
                                        id={nivel}
                                        name="nivelEducativo"
                                        value={nivel}
                                        checked={formData.nivelesEducativos === nivel}
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            nivelesEducativos: e.target.value 
                                        })}
                                        className="w-4 h-4 text-blue-600 dark:text-blue-400 
                                                 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    />
                                    <label htmlFor={nivel} className="text-sm text-gray-900 dark:text-black">
                                        {nivel}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {errors.nivelesEducativos && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.nivelesEducativos}</p>}
                    </div>

                    {errors.submit && <p className="text-red-500 dark:text-red-400 text-center">{errors.submit}</p>}

                    {/* Botón submit actualizado */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 
                                  bg-white/95 dark:bg-gray-800/95 
                                  backdrop-blur-sm shadow-lg 
                                  md:relative md:p-0 md:bg-transparent md:shadow-none">
                        <div className="max-w-2xl mx-auto">
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 
                                        dark:from-blue-500 dark:to-purple-500
                                        text-white py-4 px-6 rounded-lg font-medium 
                                        hover:shadow-lg transition-all
                                        focus:outline-none focus:ring-2 
                                        focus:ring-blue-500 focus:ring-offset-2
                                        dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                            >
                                Comenzar Test
                            </button>
                        </div>
                    </div>

                    {/* Espacio extra para evitar que el botón tape contenido en móvil */}
                    <div className="h-20 md:h-0" />
                </form>
            </div>
        </div>
    );
};

export default DatosPersonales;