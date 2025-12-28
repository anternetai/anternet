"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"

const SERVICES = [
  { value: "house_washing", label: "House Washing" },
  { value: "driveway_walkways", label: "Driveway & Walkways" },
  { value: "windows", label: "Windows" },
  { value: "gutters", label: "Gutters" },
  { value: "deck_patio", label: "Deck or Patio" },
  { value: "other", label: "Other" },
]

const TIMELINES = [
  { value: "this_week", label: "This week" },
  { value: "next_week", label: "Next week" },
  { value: "this_month", label: "Within a month" },
  { value: "just_quotes", label: "Just getting quotes" },
]

const formSchema = z.object({
  services: z.array(z.string()).min(1, "Please select at least one service"),
  name: z.string().min(2, "Please enter your name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(5, "Please enter a valid address"),
  timeline: z.string().min(1, "Please select a timeline"),
})

type FormData = z.infer<typeof formSchema>

export function LeadForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      services: [],
      name: "",
      phone: "",
      address: "",
      timeline: "",
    },
  })

  const watchedTimeline = watch("timeline")
  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const toggleService = (service: string) => {
    const updated = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service]
    setSelectedServices(updated)
    setValue("services", updated)
  }

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = []

    if (step === 1) fieldsToValidate = ["services"]
    if (step === 2) fieldsToValidate = ["name", "phone", "address"]
    if (step === 3) fieldsToValidate = ["timeline"]

    const isValid = await trigger(fieldsToValidate)
    if (isValid && step < totalSteps) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("leads").insert({
        name: data.name,
        phone: data.phone,
        address: data.address,
        services_requested: data.services,
        timeline: data.timeline,
        created_at: new Date().toISOString(),
      })

      if (error) throw error
      setIsSuccess(true)
    } catch (error) {
      console.error("Error submitting lead:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          You&apos;re All Set!
        </h3>
        <p className="text-gray-600 mb-4">
          We&apos;ll call you shortly to discuss your free quote.
        </p>
        <p className="text-sm text-gray-500">
          Check your phone for a confirmation text.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="min-h-[200px]">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What services do you need?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map((service) => (
                  <button
                    key={service.value}
                    type="button"
                    onClick={() => toggleService(service.value)}
                    className={`p-3 text-sm rounded-lg border-2 transition-all text-left ${
                      selectedServices.includes(service.value)
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedServices.includes(service.value)
                            ? "border-orange-500 bg-orange-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedServices.includes(service.value) && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </span>
                      {service.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.services && (
                <p className="text-sm text-red-500 mt-2">{errors.services.message}</p>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Select all that apply - bundle and save 15-20%!
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <Input
                id="name"
                placeholder="John Smith"
                {...register("name")}
                className="h-12 text-base"
                autoComplete="name"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="(704) 555-1234"
                {...register("phone")}
                className="h-12 text-base"
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Property Address
              </label>
              <Input
                id="address"
                placeholder="123 Main St, Charlotte, NC"
                {...register("address")}
                className="h-12 text-base"
                autoComplete="street-address"
              />
              {errors.address && (
                <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                When do you need service?
              </label>
              <div className="space-y-2">
                {TIMELINES.map((timeline) => (
                  <button
                    key={timeline.value}
                    type="button"
                    onClick={() => setValue("timeline", timeline.value)}
                    className={`w-full p-3 text-sm rounded-lg border-2 transition-all text-left ${
                      watchedTimeline === timeline.value
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          watchedTimeline === timeline.value
                            ? "border-orange-500"
                            : "border-gray-300"
                        }`}
                      >
                        {watchedTimeline === timeline.value && (
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                        )}
                      </span>
                      {timeline.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.timeline && (
                <p className="text-sm text-red-500 mt-2">{errors.timeline.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            className="flex-1 h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        {step < totalSteps ? (
          <Button
            type="button"
            onClick={nextStep}
            className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Get My Free Quote"
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-gray-500">
        No obligation. Free quotes. We respect your privacy.
      </p>
    </form>
  )
}
