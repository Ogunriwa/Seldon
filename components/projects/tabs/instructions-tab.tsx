'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function InstructionsTab({
  projectId,
  initialInstructions,
  onSaveSuccess,
}: {
  projectId: string;
  initialInstructions: string;
  onSaveSuccess?: (instructions: string) => void;
}) {
  // ── State ──────────────────────────────────────────
  const [instructions, setInstructions] = useState(initialInstructions);
  const [draft, setDraft] = useState(initialInstructions);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch fresh data on mount to ensure we don't show stale initialInstructions
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project?.instructions !== undefined) {
          setInstructions(data.project.instructions);
          setDraft(data.project.instructions);
        }
      })
      .catch((err) => console.error('Failed to refresh instructions:', err));
  }, [projectId]);

  /*
   * Instructions Update:
   * Saves the global instructions text to the project.
   * → PATCH /api/projects/[id] — handled by app/api/projects/[id]/route.ts
   */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: draft }),
      });
      if (res.ok) {
        setInstructions(draft);
        setIsEditing(false);
        if (onSaveSuccess) onSaveSuccess(draft);
      }
    } catch (err) {
      console.error('Failed to save instructions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setDraft(instructions);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(instructions);
    setIsEditing(false);
  };

  // ── Shared inner content for the text box ──────────
  const textBoxContent = (
    <div className="flex items-start overflow-auto px-[20px] py-[10px] rounded-[20px] w-full flex-1 min-h-0">
      {isEditing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add detailed instructions for how Seldon helps you with this project\n\ne.g.\nRole\nYou are a hands-on machine learning tutor...\n\nLearner Profile\nPrefers building over watching/reading...`}
          className="flex-1 min-w-0 font-['Inter'] font-medium leading-normal text-[12px] text-black dark:text-white bg-transparent outline-none resize-none w-full h-full whitespace-pre-wrap"
        />
      ) : (
        <div className="flex-1 min-w-0 font-['Inter'] font-medium leading-normal text-[12px] text-black dark:text-white whitespace-pre-wrap">
          {instructions || (
            <span className="text-neutral-400 dark:text-neutral-500 italic">
              No instructions set. Click Edit to add project instructions.
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-start relative size-full">
      {/* Header — same pattern as Library/Memories, no button */}
      <div className="bg-white dark:bg-neutral-900 flex items-center justify-between pb-[20px] pt-[40px] px-[24px] w-full shrink-0">
        <div className="flex flex-col gap-[6px] items-start shrink-0">
          <p className="font-['Inter'] font-bold text-[#111827] dark:text-white text-[20px] m-0">
            Project Instructions
          </p>
          <p className="font-['Inter'] font-normal text-[#4b5563] dark:text-neutral-400 text-[14px] m-0">
            Define how Seldon assists you across all threads in this project
          </p>
        </div>
      </div>

      {/* Instructions Content Area */}
      <div className="flex flex-col items-start px-[24px] pb-[40px] w-full flex-1 min-h-0">
        <div className="flex flex-col gap-[10px] items-start w-full flex-1 min-h-0">

          {/* Text Box — gradient border when editing, plain border when viewing */}
          {isEditing ? (
            <div className="rounded-[16px] p-[0.75px] bg-gradient-to-br from-[#EE6055] to-[#57C4E5] w-full flex-1 min-h-0 flex flex-col">
              <div className="bg-white dark:bg-neutral-900 rounded-[15.25px] flex flex-col items-start overflow-clip py-[10px] w-full flex-1 min-h-0">
                {textBoxContent}
              </div>
            </div>
          ) : (
            <div className="border border-solid border-[rgba(0,0,0,0.09)] dark:border-neutral-700 rounded-[16px] flex flex-col items-start overflow-clip py-[10px] w-full flex-1 min-h-0">
              {textBoxContent}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Area */}
      <div className="flex gap-[10px] h-[85px] items-end justify-end overflow-clip pr-[20px] py-[10px] w-full shrink-0">
        {isEditing ? (
          <>
            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="bg-white dark:bg-neutral-900 border border-[#e5e7eb] dark:border-neutral-700 flex items-center justify-center overflow-clip px-[24px] py-[12px] rounded-[8px] shrink-0 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <span className="font-['Inter'] font-semibold leading-normal text-[16px] text-black dark:text-white whitespace-nowrap">
                Cancel
              </span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-black dark:bg-white flex items-center justify-center overflow-clip px-[24px] py-[12px] rounded-[8px] shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[90px]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-white dark:text-black" />
              ) : (
                <span className="font-['Inter'] font-semibold leading-normal text-[16px] text-white dark:text-black whitespace-nowrap">
                  Save
                </span>
              )}
            </button>
          </>
        ) : (
          /* Edit Button */
          <button
            type="button"
            onClick={handleEdit}
            className="bg-black dark:bg-white flex items-center justify-center overflow-clip px-[24px] py-[12px] rounded-[8px] shrink-0 hover:opacity-90 transition-opacity"
          >
            <span className="font-['Inter'] font-semibold leading-normal text-[16px] text-white dark:text-black whitespace-nowrap">
              Edit
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
