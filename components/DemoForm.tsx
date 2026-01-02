"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, ArrowRight, ArrowLeft, Loader2, Phone, Home, DollarSign, Calendar, User } from "lucide-react"

const PROJECT_TYPES = [
  { value: "kitchen", label: "Kitchen Remodel", icon: "🍳" },
  { value: "bathroom", label: "Bathroom Remodel", icon: "🚿" },
  { value: "full_remodel", label: "Full Home Remodel", icon: "🏠" },
  { value: "addition", label: "Room Addition", icon: "➕" },
  { value: "basement", label: "Basement Finish", icon: "🏗️" },
  { value: "deck_patio", label: "Deck / Patio", icon: "🌿" },
]

const HOME_AGE = [
  { value: "0-10", label: "Built in last 10 years" },
  { value: "10-30", label: "10-30 years old" },
  { value: "30-50", label: "30-50 years old" },
  { value: "50+", label: "50+ years old" },
]

const TIMELINES = [
  { value: "asap", label: "Ready to start ASAP" },
  { value: "1-3months", label: "Within 1-3 months" },
  { value: "3-6months", label: "3-6 months out" },
  { value: "planning", label: "Just planning for now" },
]

const BUDGETS = [
  { value: "25-50k", label: "$25,000 - $50,000" },
  { value: "50-100k", label: "$50,000 - $100,000" },
  { value: "100-200k", label: "$100,000 - $200,000" },
  { value: "200k+", label: "$200,000+" },
  { value: "unsure", label: "Not sure yet" },
]

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash / Savings" },
  { value: "financing", label: "Financing" },
  { value: "heloc", label: "Home Equity / HELOC" },
  { value: "exploring", label: "Exploring options" },
]

const formSchema = z.object({
  projectType: z.string().min(1, "Please select a project type"),
  homeAge: z.string().min(1, "Please select your home age"),
  timeline: z.string().min(1, "Please select a timeline"),
  budget: z.string().min(1, "Please select a budget range"),
  paymentMethod: z.string().min(1, "Please select a payment method"),
  address: z.string().min(5, "Please enter your address"),
  name: z.string().min(2, "Please enter your name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email"),
})

type FormData = z.infer<typeof formSchema>

interface DemoFormProps {
  onSubmitSuccess?: (data: FormData) => void
}

export function DemoForm({ onSubmitSuccess }: DemoFormProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectType: "",
      homeAge: "",
      timeline: "",
      budget: "",
      paymentMethod: "",
      address: "",
      name: "",
      phone: "",
      email: "",
    },
  })

  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  const watchedProjectType = watch("projectType")
  const watchedHomeAge = watch("homeAge")
  const watchedTimeline = watch("timeline")
  const watchedBudget = watch("budget")
  const watchedPaymentMethod = watch("paymentMethod")

  const stepTitles = [
    "Project Type",
    "Home Details",
    "Budget",
    "Address",
    "Contact Info"
  ]

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = []

    if (step === 1) fieldsToValidate = ["projectType"]
    if (step === 2) fieldsToValidate = ["homeAge", "timeline"]
    if (step === 3) fieldsToValidate = ["budget", "paymentMethod"]
    if (step === 4) fieldsToValidate = ["address"]
    if (step === 5) fieldsToValidate = ["name", "phone", "email"]

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
      // Save to Supabase
      const { error } = await supabase.from("demo_leads").insert({
        project_type: data.projectType,
        home_age: data.homeAge,
        timeline: data.timeline,
        budget: data.budget,
        payment_method: data.paymentMethod,
        address: data.address,
        name: data.name,
        phone: data.phone,
        email: data.email,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Supabase error:", error)
        // Continue anyway for demo purposes
      }

      // Trigger VAPI call (will be wired up next)
      try {
        const vapiResponse = await fetch('/api/trigger-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: data.phone,
            name: data.name,
            projectType: data.projectType,
          })
        })

        if (!vapiResponse.ok) {
          console.log("VAPI trigger pending setup")
        }
      } catch (vapiError) {
        console.log("VAPI call will be configured")
      }

      setIsSuccess(true)
      onSubmitSuccess?.(data)
    } catch (error) {
      console.error("Error submitting:", error)
      // Still show success for demo
      setIsSuccess(true)
      onSubmitSuccess?.(getValues())
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 mb-6 shadow-lg shadow-orange-500/30">
          <Phone className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-3">
          Calling You Now!
        </h3>
        <p className="text-gray-400 text-lg mb-6">
          Pick up your phone - our AI assistant is calling to walk you through your project.
        </p>
        <div className="inline-flex items-center gap-2 text-orange-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting...
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Step {step} of {totalSteps}</span>
          <span className="text-orange-400 font-medium">{stepTitles[step - 1]}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex justify-between px-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i + 1 <= step
                  ? 'bg-orange-500 scale-110'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Form Steps */}
      <div className="min-h-[320px]">

        {/* Step 1: Project Type */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">What type of project?</h2>
              <p className="text-gray-400">Select your remodeling project</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_TYPES.map((project) => (
                <button
                  key={project.value}
                  type="button"
                  onClick={() => setValue("projectType", project.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    watchedProjectType === project.value
                      ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20"
                      : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"
                  }`}
                >
                  <span className="text-2xl mb-2 block">{project.icon}</span>
                  <span className={`text-sm font-medium ${
                    watchedProjectType === project.value ? 'text-orange-400' : 'text-gray-300'
                  }`}>
                    {project.label}
                  </span>
                </button>
              ))}
            </div>
            {errors.projectType && (
              <p className="text-sm text-red-400 text-center">{errors.projectType.message}</p>
            )}
          </div>
        )}

        {/* Step 2: Home Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <Home className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white mb-2">Tell us about your home</h2>
            </div>

            {/* Home Age */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-400">How old is your home?</label>
              <div className="grid grid-cols-2 gap-2">
                {HOME_AGE.map((age) => (
                  <button
                    key={age.value}
                    type="button"
                    onClick={() => setValue("homeAge", age.value)}
                    className={`p-3 rounded-lg border transition-all text-sm ${
                      watchedHomeAge === age.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {age.label}
                  </button>
                ))}
              </div>
              {errors.homeAge && (
                <p className="text-sm text-red-400">{errors.homeAge.message}</p>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-400">When do you want to start?</label>
              <div className="space-y-2">
                {TIMELINES.map((timeline) => (
                  <button
                    key={timeline.value}
                    type="button"
                    onClick={() => setValue("timeline", timeline.value)}
                    className={`w-full p-3 rounded-lg border transition-all text-left text-sm ${
                      watchedTimeline === timeline.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Calendar className={`w-4 h-4 ${
                        watchedTimeline === timeline.value ? 'text-orange-400' : 'text-gray-500'
                      }`} />
                      {timeline.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.timeline && (
                <p className="text-sm text-red-400">{errors.timeline.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Budget */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <DollarSign className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white mb-2">Budget & Payment</h2>
            </div>

            {/* Budget Range */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-400">Estimated budget range</label>
              <div className="space-y-2">
                {BUDGETS.map((budget) => (
                  <button
                    key={budget.value}
                    type="button"
                    onClick={() => setValue("budget", budget.value)}
                    className={`w-full p-3 rounded-lg border transition-all text-left text-sm ${
                      watchedBudget === budget.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {budget.label}
                  </button>
                ))}
              </div>
              {errors.budget && (
                <p className="text-sm text-red-400">{errors.budget.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-400">Payment method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setValue("paymentMethod", method.value)}
                    className={`p-3 rounded-lg border transition-all text-sm ${
                      watchedPaymentMethod === method.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              {errors.paymentMethod && (
                <p className="text-sm text-red-400">{errors.paymentMethod.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Address */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <Home className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white mb-2">Property Address</h2>
              <p className="text-gray-400 text-sm">So we can match you with local contractors</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-2">
                  Street Address
                </label>
                <Input
                  id="address"
                  placeholder="123 Main Street, Charlotte, NC 28205"
                  {...register("address")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                  autoComplete="street-address"
                />
                {errors.address && (
                  <p className="text-sm text-red-400 mt-2">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Contact Info */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <User className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white mb-2">Almost Done!</h2>
              <p className="text-gray-400 text-sm">We&apos;ll call you within 30 seconds</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">
                  Your Name
                </label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  {...register("name")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="text-sm text-red-400 mt-2">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(704) 555-1234"
                  {...register("phone")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                  autoComplete="tel"
                />
                {errors.phone && (
                  <p className="text-sm text-red-400 mt-2">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register("email")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-400 mt-2">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            className="flex-1 h-14 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        {step < totalSteps ? (
          <Button
            type="button"
            onClick={nextStep}
            className="flex-1 h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold shadow-lg shadow-orange-500/25"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold shadow-lg shadow-orange-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5 mr-2" />
                Get My Free Quote
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-gray-500">
        We&apos;ll call you immediately with your personalized quote.
      </p>
    </form>
  )
}
