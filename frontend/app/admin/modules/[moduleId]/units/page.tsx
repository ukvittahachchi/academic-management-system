'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LuArrowLeft, LuPlus, LuBookOpen, LuLayoutList, LuFileText, LuX, LuSave } from 'react-icons/lu';
import { apiClient } from '@/lib/api-client';
import AdminUnitList from '@/components/admin/content/AdminUnitList';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { CardSkeleton } from '@/components/ui/LoadingSpinner';

export default function ModuleUnitsPage() {
    const params = useParams();
    const router = useRouter();
    const moduleId = params.moduleId ? parseInt(params.moduleId as string) : null;

    const [loading, setLoading] = useState(true);
    const [units, setUnits] = useState<any[]>([]);
    const [moduleInfo, setModuleInfo] = useState<any>(null);

    // Add Unit State
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitDescription, setNewUnitDescription] = useState('');
    const [editingUnit, setEditingUnit] = useState<any>(null);

    useEffect(() => {
        if (moduleId) {
            fetchData();
        }
    }, [moduleId]);

    const fetchData = async () => {
        try {
            setLoading(true);
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

    const handleEditUnit = (unitId: string) => {
        const unit = units.find(u => u.unit_id === unitId);
        if (unit) {
            setEditingUnit(unit);
            setNewUnitName(unit.unit_name);
            setNewUnitDescription(unit.description || '');
            setShowAddUnit(true);
        }
    };

    const handleDeleteUnit = async (unitId: string) => {
        if (!confirm('Are you sure you want to delete this unit? All content must be removed first.')) return;

        try {
            await apiClient.deleteUnit(unitId);
            fetchData();
        } catch (error: any) {
            console.error('Failed to delete unit:', error);
            alert(error.message || 'Failed to delete unit');
        }
    };

    const handleSaveUnit = async () => {
        if (!newUnitName.trim()) return;

        try {
            if (editingUnit) {
                await apiClient.updateUnit(editingUnit.unit_id, {
                    unit_name: newUnitName,
                    description: newUnitDescription
                });
            } else {
                await apiClient.createUnit({
                    module_id: moduleId,
                    unit_name: newUnitName,
                    description: newUnitDescription,
                    learning_objectives: ''
                });
            }
            setNewUnitName('');
            setNewUnitDescription('');
            setEditingUnit(null);
            setShowAddUnit(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save unit:', error);
            alert('Failed to save unit');
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

    const handleManageUnit = (unitId: string) => {
        router.push(`/admin/modules/${moduleId}/units/${unitId}`);
    };

    if (!moduleId) return <div>Invalid Module ID</div>;

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
                                        {moduleInfo?.module_name || 'Loading...'}
                                    </h1>
                                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">
                                            {moduleInfo?.grade_level || 'Grade ...'}
                                        </span>
                                        Unit Management
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {loading ? (
                        <div className="space-y-4">
                            <CardSkeleton />
                            <CardSkeleton />
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <LuLayoutList className="w-5 h-5 text-purple-600" />
                                    Course Units
                                </h2>
                                <button
                                    onClick={() => {
                                        setEditingUnit(null);
                                        setNewUnitName('');
                                        setNewUnitDescription('');
                                        setShowAddUnit(true);
                                    }}
                                    className="text-sm bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/30 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 transform active:scale-95"
                                >
                                    <LuPlus className="w-4 h-4" /> Create New Unit
                                </button>
                            </div>

                            {showAddUnit && (
                                <div className="bg-white p-6 rounded-[1.5rem] border border-purple-100 shadow-lg mb-8 animate-[fade-in_0.3s_ease-out]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-gray-800 uppercase text-xs tracking-wider">
                                            {editingUnit ? 'Edit Unit Details' : 'Create New Unit'}
                                        </h4>
                                        <button onClick={() => setShowAddUnit(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                            <LuX className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={newUnitName}
                                        onChange={(e) => setNewUnitName(e.target.value)}
                                        placeholder="Unit Name (e.g. Unit 1: Basics)"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-bold text-gray-900 mb-4"
                                        autoFocus
                                    />
                                    <textarea
                                        value={newUnitDescription}
                                        onChange={(e) => setNewUnitDescription(e.target.value)}
                                        placeholder="Brief description of what this unit covers..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-none h-28 text-sm mb-6 font-medium"
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setShowAddUnit(false);
                                                setEditingUnit(null);
                                                setNewUnitName('');
                                                setNewUnitDescription('');
                                            }}
                                            className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveUnit}
                                            disabled={!newUnitName.trim()}
                                            className="px-6 py-2.5 text-sm bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transform active:scale-95 transition-all"
                                        >
                                            <LuSave className="w-4 h-4" />
                                            {editingUnit ? 'Save Changes' : 'Create Unit'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50/50 rounded-[2rem] p-1">
                                <AdminUnitList
                                    units={units}
                                    onReorder={handleReorder}
                                    onEdit={handleEditUnit}
                                    onDelete={handleDeleteUnit}
                                    onManage={handleManageUnit}
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AdminRoute>
    );
}
