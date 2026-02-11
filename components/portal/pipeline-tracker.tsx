"use client"

import { useState } from "react"
import { Check, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CLIENT_PIPELINE_STAGES, CLIENT_PIPELINE_CONFIG } from "@/lib/portal/constants"
import { formatDate } from "@/lib/portal/format"
import type { ClientDetail, ClientPipelineStage } from "@/lib/portal/types"

interface PipelineTrackerProps {
  client: ClientDetail
  onStageChange: (stage: ClientPipelineStage) => void
}

// Map stages to their date fields in ClientDetail
const STAGE_DATE_MAP: Partial<Record<ClientPipelineStage, keyof ClientDetail>> = {
  demo: "demo_call_at",
  onboarding: "onboarding_call_at",
  launch: "launch_call_at",
}

export function PipelineTracker({ client, onStageChange }: PipelineTrackerProps) {
  const [confirmStage, setConfirmStage] = useState<ClientPipelineStage | null>(null)
  const currentIndex = CLIENT_PIPELINE_STAGES.indexOf(client.pipeline_stage)
  const config = CLIENT_PIPELINE_CONFIG[client.pipeline_stage]

  function handleStepClick(stage: ClientPipelineStage) {
    const clickedIndex = CLIENT_PIPELINE_STAGES.indexOf(stage)
    // Only allow advancing to the next stage
    if (clickedIndex === currentIndex + 1) {
      setConfirmStage(stage)
    }
  }

  function handleConfirm() {
    if (confirmStage) {
      onStageChange(confirmStage)
      setConfirmStage(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Horizontal stepper */}
          <div className="flex items-center justify-between">
            {CLIENT_PIPELINE_STAGES.map((stage, index) => {
              const stageConfig = CLIENT_PIPELINE_CONFIG[stage]
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const isNext = index === currentIndex + 1
              const isFuture = index > currentIndex

              // Get the date for completed stages
              const dateKey = STAGE_DATE_MAP[stage]
              const stageDate = dateKey ? (client[dateKey] as string | null) : null

              return (
                <div key={stage} className="flex flex-1 items-center">
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepClick(stage)}
                      disabled={!isNext}
                      className={[
                        "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                        isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                        isCurrent && "border-blue-500 bg-blue-500 text-white animate-pulse",
                        isNext && "border-blue-300 bg-transparent text-blue-500 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950",
                        isFuture && !isNext && "border-muted-foreground/30 bg-transparent text-muted-foreground/50 cursor-not-allowed",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-label={`${stageConfig.label}${isCompleted ? " (completed)" : isCurrent ? " (current)" : ""}`}
                    >
                      {isCompleted ? (
                        <Check className="size-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </button>
                    <span
                      className={[
                        "text-xs font-medium text-center whitespace-nowrap",
                        isCompleted && "text-emerald-600 dark:text-emerald-400",
                        isCurrent && "text-blue-600 dark:text-blue-400",
                        isFuture && "text-muted-foreground/60",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {stageConfig.label}
                    </span>
                    {/* Date for completed stages */}
                    {isCompleted && stageDate && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(stageDate)}
                      </span>
                    )}
                  </div>

                  {/* Connecting line (not after last item) */}
                  {index < CLIENT_PIPELINE_STAGES.length - 1 && (
                    <div
                      className={[
                        "mx-2 h-0.5 flex-1",
                        index < currentIndex
                          ? "bg-emerald-500"
                          : index === currentIndex
                            ? "bg-gradient-to-r from-blue-500 to-muted-foreground/20"
                            : "border-t-2 border-dashed border-muted-foreground/20",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Next action callout */}
          <div className="mt-5 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <ArrowRight className="size-4 shrink-0 text-blue-500" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Next Action</p>
              <p className="text-sm font-medium">{config.nextAction}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmStage} onOpenChange={() => setConfirmStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance pipeline stage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move{" "}
              <span className="font-medium text-foreground">
                {client.legal_business_name}
              </span>{" "}
              from{" "}
              <span className="font-medium text-foreground">
                {CLIENT_PIPELINE_CONFIG[client.pipeline_stage].label}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {confirmStage ? CLIENT_PIPELINE_CONFIG[confirmStage].label : ""}
              </span>.
              This action is recorded in the activity timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Advance Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
