'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LuArrowLeft, LuBookOpen } from 'react-icons/lu';
import { apiClient } from '@/lib/api-client';
import UnitContentEditor from '@/components/admin/content/UnitContentEditor';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { CardSkeleton } from '@/components/ui/LoadingSpinner';

export default function UnitDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const moduleId = params.moduleId ? parseInt(params.moduleId as string) : null;
    const unitId = params.unitId as string;

    const [loading, setLoading] = useState(true);
    const [unit, setUnit] = useState<any>(null);
    const [moduleInfo, setModuleInfo] = useState<any>(null);

    useEffect(() => {
        if (moduleId && unitId) {
            fetchData();
        }
    }, [moduleId, unitId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getModuleHierarchy(moduleId!);
            if (response.success && response.data) {
                const foundUnit = response.data.units.find((u: any) => String(u.unit_id) === unitId);
                setUnit(foundUnit || null);
                setModuleInfo(response.data.module);
            }
        } catch (error) {
            console.error('Failed to fetch unit details:', error);
            alert('Failed to load unit details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePart = async (partId: string, data: any) => {
        await apiClient.updatePartContent(partId, data);
        fetchData();
    };

    const handleCreateAssignment = async (partId: string, assignmentData: any, questions: any[]) => {
        await apiClient.createAssignment({ ...assignmentData, part_id: partId }, questions);
        fetchData();
    };

    const handleDeleteAssignment = async (partId: string) => {
        await apiClient.deleteAssignment(partId);
        fetchData();
    };

    const handleDeletePart = async (partId: string) => {
        try {
            await apiClient.deleteLearningPart(partId);
            fetchData();
        } catch (error) {
            console.error('Failed to delete part:', error);
            alert('Failed to delete learning part');
        }
    };

    const handleCreatePart = async (partData: any) => {
        try {
            await apiClient.createLearningPart(partData);
            fetchData();
        } catch (error) {
            console.error('Failed to create part:', error);
            alert('Failed to create learning part');
        }
    };

    if (!moduleId || !unitId) return <div>Invalid Parameters</div>;

    return (
        <AdminRoute>
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Header Section */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10 glass-effect">
                    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => router.back()}
                                    className="p-3 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
                                >
                                    <LuArrowLeft className="w-6 h-6" />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <span className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                                            <LuBookOpen className="w-6 h-6" />
                                        </span>
                                        {unit?.unit_name || 'Loading Unit...'}
                                    </h1>
                                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">
                                            {moduleInfo?.module_name || 'Module ...'}
                                        </span>
                                        Unit Editor
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {loading ? (
                        <CardSkeleton />
                    ) : unit ? (
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-100 bg-gray-50/30">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                                        <LuBookOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{unit.unit_name}</h2>
                                        <p className="text-gray-500 mt-1 font-medium">{unit.description || 'No description provided for this unit.'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <UnitContentEditor
                                    unitId={unit.unit_id}
                                    parts={unit.parts || []}
                                    onUpdatePart={handleUpdatePart}
                                    onCreateAssignment={handleCreateAssignment}
                                    onDeleteAssignment={handleDeleteAssignment}
                                    onCreatePart={handleCreatePart}
                                    onDeletePart={handleDeletePart}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Unit not found.</p>
                        </div>
                    )}
                </main>
            </div>
        </AdminRoute>
    );
}
