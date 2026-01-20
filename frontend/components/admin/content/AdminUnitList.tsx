'use client';

import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LuGripVertical, LuPencil, LuTrash2, LuArrowRight, LuInbox } from 'react-icons/lu';

interface Unit {
    unit_id: string;
    unit_name: string;
    unit_order: number;
    description: string;
}

interface AdminUnitListProps {
    units: Unit[];
    onReorder: (newUnits: Unit[]) => void;
    onEdit: (unitId: string) => void;
    onDelete: (unitId: string) => void;
    onManage: (unitId: string) => void;
}

const SortableItem = ({ unit, onEdit, onDelete, onManage }: { unit: Unit; onEdit: (id: string) => void; onDelete: (id: string) => void; onManage: (id: string) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: unit.unit_id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as 'relative' : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center p-4 mb-3 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-purple-100 ${isDragging ? 'opacity-90 ring-2 ring-purple-500 shadow-xl scale-[1.02]' : ''
                }`}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="mr-3 cursor-grab hover:text-purple-600 active:cursor-grabbing p-2 text-gray-300 hover:bg-purple-50 rounded-xl transition-colors flex-shrink-0"
            >
                <LuGripVertical className="w-5 h-5" />
            </div>

            {/* Content */}
            <div
                onClick={() => onManage(unit.unit_id)}
                className="flex-1 min-w-0 mr-4 cursor-pointer"
            >
                <h4 className="font-bold text-gray-900 text-base break-words leading-tight mb-1 group-hover:text-purple-600 transition-colors">{unit.unit_name}</h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{unit.description || 'No description'}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(unit.unit_id)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit Unit Details"
                >
                    <LuPencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(unit.unit_id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Unit"
                >
                    <LuTrash2 className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-100 mx-2" />
            </div>

            <button
                onClick={() => onManage(unit.unit_id)}
                className="flex items-center gap-1.5 pl-3 pr-4 py-2 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap ml-1"
            >
                <span>Manage</span>
                <LuArrowRight className="w-3 h-3" />
            </button>
        </div>
    );
};

const AdminUnitList: React.FC<AdminUnitListProps> = ({ units, onReorder, onEdit, onDelete, onManage }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = units.findIndex(u => u.unit_id === active.id);
            const newIndex = units.findIndex(u => u.unit_id === over.id);

            const newUnits = arrayMove(units, oldIndex, newIndex).map((u, idx) => ({
                ...u,
                unit_order: idx + 1
            }));

            onReorder(newUnits);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={units.map(u => u.unit_id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2 pb-4">
                    {units.map((unit) => (
                        <SortableItem
                            key={unit.unit_id}
                            unit={unit}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onManage={onManage}
                        />
                    ))}
                    {units.length === 0 && (
                        <div className="text-center py-12 px-4 bg-white border border-dashed border-gray-200 rounded-[2rem]">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                <LuInbox className="w-8 h-8" />
                            </div>
                            <h3 className="text-gray-900 font-bold text-sm mb-1">No units created yet</h3>
                            <p className="text-gray-500 text-xs">Add your first unit to organize content.</p>
                        </div>
                    )}
                </div>
            </SortableContext>
        </DndContext>
    );
};

export default AdminUnitList;
