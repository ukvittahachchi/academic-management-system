'use client';

import React, { useState } from 'react';
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
import { GripVertical } from 'lucide-react';

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
}

const SortableItem = ({ unit, onEdit }: { unit: Unit; onEdit: (id: string) => void }) => {
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
        position: isDragging ? 'relative' as 'relative' : undefined, // Fix typescript complaint
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center p-3 mb-2 bg-white border rounded-md shadow-sm select-none ${isDragging ? 'opacity-50 ring-2 ring-indigo-500' : 'border-gray-200'
                }`}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="mr-3 cursor-grab hover:text-indigo-600 active:cursor-grabbing p-1"
            >
                <GripVertical className="w-5 h-5 text-gray-400" />
            </div>

            {/* Content */}
            <div className="flex-1">
                <h4 className="font-medium text-gray-900">{unit.unit_name}</h4>
                <p className="text-xs text-gray-500 truncate max-w-md">{unit.description}</p>
            </div>

            {/* Actions */}
            <button
                onClick={() => onEdit(unit.unit_id)}
                className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 ml-4"
            >
                Manage Content
            </button>
        </div>
    );
};

const AdminUnitList: React.FC<AdminUnitListProps> = ({ units, onReorder, onEdit }) => {
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

            // Reorder using dnd-kit helper
            const newUnits = arrayMove(units, oldIndex, newIndex).map((u, idx) => ({
                ...u,
                unit_order: idx + 1 // Update order numbers
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
                <div className="space-y-2">
                    {units.map((unit) => (
                        <SortableItem key={unit.unit_id} unit={unit} onEdit={onEdit} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};

export default AdminUnitList;
