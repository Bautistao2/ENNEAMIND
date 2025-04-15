'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';

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
        nivelesEducativos: '', // Cambiar de array a string
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const startTime = Date.now();

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const userId = localStorage.getItem('user_id') || uuidv4();
        localStorage.setItem('user_id', userId);

        const duracionTestSegundos = Math.floor((Date.now() - startTime) / 1000);

        const dataToSend = {
            user_id: userId,
            edad: parseInt(formData.edad),
            sexo: formData.sexo,
            comunidad_autonoma: formData.comunidadAutonoma,
            provincia: formData.provincia,
            localidad: formData.localidad,
            educacion: [formData.nivelesEducativos], // Send as array
            duracion_test: duracionTestSegundos,
        };
        
        console.log('Datos a enviar:', dataToSend);

        try {
            // Verificar la conexión con Supabase
            const { data: connectionTest, error: connectionError } = await supabase
                .from('results_test')
                .select('count')
                .limit(1);

            if (connectionError) {
                console.error('Error de conexión con Supabase:', connectionError);
                throw new Error('Error de conexión con la base de datos');
            }

            // Intentar insertar los datos
            const { data, error } = await supabase
                .from('results_test')
                .insert([dataToSend])
                .select('*')
                .single();

            if (error) {
                console.error('Error al insertar datos:', error.message);
                console.error('Código de error:', error.code);
                console.error('Detalles:', error.details);
                throw error;
            }

            console.log('Datos insertados correctamente:', data);
            router.push('/test');
        } catch (error: any) {
            console.error('Error completo:', error);
            setErrors({ 
                submit: `Error al guardar los datos: ${error.message || 'Error desconocido'}`
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 py-12 px-4">
            <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl">
                <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
                    📝 Datos Personales
                </h1>
                <p className="text-gray-600 text-center mb-8 text-lg">
                    Por favor, completa tus datos para comenzar el test
                </p>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Edad</label>
                        <input
                            type="number"
                            min="10"
                            max="90"
                            value={formData.edad}
                            onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ingresa tu edad"
                        />
                        {errors.edad && <p className="text-red-500 text-sm mt-2">{errors.edad}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                        <select
                            value={formData.sexo}
                            onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Seleccione...</option>
                            {SEXO_OPTIONS.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        {errors.sexo && <p className="text-red-500 text-sm mt-2">{errors.sexo}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Comunidad Autónoma</label>
                        <input
                            type="text"
                            list="comunidades"
                            value={formData.comunidadAutonoma}
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                comunidadAutonoma: e.target.value,
                                provincia: ''
                            })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Selecciona tu comunidad"
                        />
                        <datalist id="comunidades">
                            {COMUNIDADES_AUTONOMAS.map((ca) => (
                                <option key={ca} value={ca} />
                            ))}
                        </datalist>
                        {errors.comunidadAutonoma && <p className="text-red-500 text-sm mt-2">{errors.comunidadAutonoma}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label>
                        <select
                            value={formData.provincia}
                            onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!formData.comunidadAutonoma}
                        >
                            <option value="">Seleccione una provincia...</option>
                            {formData.comunidadAutonoma && 
                                PROVINCIAS_POR_COMUNIDAD[formData.comunidadAutonoma]?.map((provincia) => (
                                    <option key={provincia} value={provincia}>{provincia}</option>
                                ))
                            }
                        </select>
                        {errors.provincia && <p className="text-red-500 text-sm mt-2">{errors.provincia}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Localidad</label>
                        <input
                            type="text"
                            maxLength={50}
                            value={formData.localidad}
                            onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ingresa tu localidad"
                        />
                        {errors.localidad && <p className="text-red-500 text-sm mt-2">{errors.localidad}</p>}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-4">Nivel Educativo</label>
                        <div className="grid md:grid-cols-2 gap-3">
                            {NIVELES_EDUCATIVOS.map((nivel) => (
                                <div key={nivel} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
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
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor={nivel} className="text-sm text-gray-700">{nivel}</label>
                                </div>
                            ))}
                        </div>
                        {errors.nivelesEducativos && <p className="text-red-500 text-sm mt-2">{errors.nivelesEducativos}</p>}
                    </div>

                    {errors.submit && <p className="text-red-500 text-center">{errors.submit}</p>}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg font-medium
                                 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Comenzar Test
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DatosPersonales;