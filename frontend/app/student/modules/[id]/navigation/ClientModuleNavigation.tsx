'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { ModuleHierarchy } from '@/lib/types/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage, EmptyState } from '@/components/ui/ErrorMessage';
import StudentButton from '@/components/ui/StudentButton';
import { LuArrowLeft, LuSearch, LuBookOpen, LuMonitor, LuVideo, LuPen, LuCheck, LuClock, LuPlay, LuDownload, LuChevronDown, LuTrophy, LuLayers, LuLock } from 'react-icons/lu';

export default function ClientModuleNavigation() {
    const params = useParams();
    const router = useRouter();
    const [moduleHierarchy, setModuleHierarchy] = useState<ModuleHierarchy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedUnits, setExpandedUnits] = useState<number[]>([]);

    // Minimal core logic implementation to restore functionality quickly
    const moduleId = params.id as string;

    useEffect(() => {
        if (moduleId) fetchModuleHierarchy();
    }, [moduleId]);

    const fetchModuleHierarchy = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getModuleHierarchy(parseInt(moduleId));
            setModuleHierarchy(response.data);
            if (response.data.units?.length > 0) setExpandedUnits([response.data.units[0].unit_id]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleUnit = (unitId: number) => {
        setExpandedUnits(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);
    };

    if (loading) return <LoadingSpinner />;
    if (error || !moduleHierarchy) return <ErrorMessage error={error || 'Failed'} />;

    const { module, units } = moduleHierarchy;

    return (
        <StudentRoute>
            <div className="min-h-screen bg-gray-50/50 pb-24">
                <header className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 relative text-white">
                    <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                        <StudentButton onClick={() => router.push('/student/modules')} variant="ghost" className="text-white hover:bg-white/10 mb-4"><LuArrowLeft className="mr-2" /> Modules</StudentButton>
                        <h1 className="text-4xl font-black">{module.module_name}</h1>
                        <div className="mt-4 flex gap-4">
                            <div className="bg-white/10 px-4 py-2 rounded-xl flex flex-col">
                                <span className="text-2xl font-bold">{module.progress.progress_percentage}%</span>
                                <span className="text-xs uppercase opacity-70">Completed</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 space-y-6">
                    {units.map((unit, index) => {
                        const isLocked = index > 0 && (units[index - 1].progress_percentage || 0) < 100;

                        return (
                            <div key={unit.unit_id} className={`rounded-[2rem] shadow-sm border overflow-hidden transition-all duration-300 ${isLocked ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-100'}`}>
                                <div
                                    className={`p-8 flex justify-between items-start ${!isLocked ? 'cursor-pointer hover:bg-gray-50/50' : 'cursor-not-allowed'}`}
                                    onClick={() => !isLocked && toggleUnit(unit.unit_id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg ${isLocked ? 'bg-gray-200 text-gray-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                                Unit {index + 1}
                                            </span>
                                            {isLocked && <div className="flex items-center gap-1 text-xs font-bold text-gray-400"><LuLock className="w-3 h-3" /> Locked</div>}
                                            {!isLocked && (unit.progress_percentage || 0) === 100 && <div className="flex items-center gap-1 text-xs font-bold text-green-600"><LuCheck className="w-3 h-3" /> Completed</div>}
                                        </div>
                                        <h2 className={`text-2xl font-black ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{unit.unit_name}</h2>
                                        <p className={`mt-2 ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>{unit.description}</p>
                                    </div>
                                    <div className="ml-4">
                                        {isLocked ? (
                                            <div className="p-3 bg-gray-100 rounded-full text-gray-400"><LuLock className="w-6 h-6" /></div>
                                        ) : (
                                            <div className={`p-3 rounded-full transition-transform duration-300 ${expandedUnits.includes(unit.unit_id) ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-gray-50 text-gray-400'}`}>
                                                <LuChevronDown className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {expandedUnits.includes(unit.unit_id) && !isLocked && (
                                    <div className="bg-gray-50/30 border-t border-gray-100 p-6 space-y-4">
                                        {unit.parts?.map((part) => (
                                            <div key={part.part_id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${part.student_status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        {part.student_status === 'completed' ? <LuCheck /> : <LuBookOpen />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{part.title}</h4>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 uppercase font-bold tracking-wide mt-1">
                                                            <span>{part.part_type}</span>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <span>{part.duration_minutes} min</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <StudentButton
                                                    size="sm"
                                                    variant={part.student_status === 'completed' ? 'outline' : 'primary'}
                                                    onClick={() => router.push(`/student/modules/learn/${part.part_id}`)}
                                                >
                                                    {part.student_status === 'completed' ? 'Review' : (part.student_status === 'in_progress' ? 'Continue' : 'Start')}
                                                </StudentButton>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </main>
            </div>
        </StudentRoute>
    );
}
