'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import AdminUnitList from '@/components/admin/content/AdminUnitList';
import UnitContentEditor from '@/components/admin/content/UnitContentEditor';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { CardSkeleton } from '@/components/ui/LoadingSpinner';

export default function ModuleUnitsPage() {
    const params = useParams();
    const router = useRouter();
    const moduleId = params.moduleId ? parseInt(params.moduleId as string) : null;

    const [loading, setLoading] = useState(true);
    const [units, setUnits] = useState<any[]>([]);
    const [moduleInfo, setModuleInfo] = useState<any>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

    useEffect(() => {
        if (moduleId) {
            fetchData();
        }
    }, [moduleId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // We use getModuleHierarchy to get units and their parts
            const response = await apiClient.getModuleHierarchy(moduleId!);
            if (response.success && response.data) {
                setUnits(response.data.units || []);
                setModuleInfo(response.data.module);
            }
        } catch (error) {
            console.error('Failed to fetch units:', error);
            alert('Failed to load module units');
        } finally {
            setLoading(false);
        }
    };

    const handleReorder = async (newUnits: any[]) => {
        setUnits(newUnits); // Optimistic update
        try {
            const unitOrders = newUnits.map((u, index) => ({
                unit_id: u.unit_id,
                unit_order: index + 1
            }));
            await apiClient.reorderUnits(moduleId!, unitOrders);
        } catch (error) {
            console.error('Reorder failed:', error);
            alert('Failed to save order');
            fetchData(); // Revert
        }
    };

    const handleUpdatePart = async (partId: string, data: any) => {
        await apiClient.updatePartContent(partId, data);
        fetchData(); // Refresh to show updates
    };

    const handleCreateAssignment = async (partId: string, assignmentData: any, questions: any[]) => {
        await apiClient.createAssignment({ ...assignmentData, part_id: partId }, questions);
        fetchData();
    };

    const selectedUnit = units.find(u => u.unit_id === selectedUnitId);

    if (!moduleId) return <div>Invalid Module ID</div>;

    return (
        <AdminRoute>
            <div className="min-h-screen bg-gray-50 pb-10">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.back()}
                                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {moduleInfo?.module_name || 'Loading...'}
                                </h1>
                                <p className="text-sm text-gray-500">Manage Units & Content</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {loading ? (
                        <CardSkeleton />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Unit List */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-lg font-semibold text-gray-700">Units</h2>
                                    {/* Placeholder for Add Unit functionality */}
                                    <button className="text-sm text-indigo-600 font-medium hover:underline flex items-center">
                                        <Plus className="w-4 h-4 mr-1" /> Add Unit
                                    </button>
                                </div>
                                <AdminUnitList
                                    units={units}
                                    onReorder={handleReorder}
                                    onEdit={(id) => setSelectedUnitId(id)}
                                />
                            </div>

                            {/* Right Column: Content Editor */}
                            <div className="lg:col-span-2">
                                {selectedUnit ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="border-b pb-4 mb-6">
                                            <h2 className="text-xl font-bold text-gray-900">{selectedUnit.unit_name}</h2>
                                            <p className="text-gray-500">{selectedUnit.description}</p>
                                        </div>

                                        <UnitContentEditor
                                            unitId={selectedUnit.unit_id}
                                            parts={selectedUnit.parts || []}
                                            onUpdatePart={handleUpdatePart}
                                            onCreateAssignment={handleCreateAssignment}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 p-10 min-h-[400px]">
                                        <div className="text-5xl mb-4">👈</div>
                                        <p className="text-lg font-medium">Select a unit to manage its content</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AdminRoute>
    );
}
