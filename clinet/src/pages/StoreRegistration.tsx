import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Store, ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { signUp } from "@/services2/operations/auth";
import {
  storeRegistrationSchema,
  StoreRegistrationValues,
  StepType,
} from "@/components/store/registration/types";
import RegistrationProgress from "@/components/store/registration/RegistrationProgress";
import BusinessInfoSection from "@/components/store/registration/BusinessInfoSection";
import AddressSection from "@/components/store/registration/AddressSection";
import AccountSection from "@/components/store/registration/AccountSection";
import { useDispatch } from "react-redux";

const StoreRegistration = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StoreRegistrationValues>({
    resolver: zodResolver(storeRegistrationSchema),
    defaultValues: {
      storeName: "",
      ownerName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      businessDescription: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
      role: "store",
    },
    mode: "onChange",
  });

  const steps: StepType[] = ["business", "address", "account"];
  const {
    step,
    steps: formSteps,
    next,
    back,
    isFirstStep,
    isLastStep,
  } = useMultiStepForm<StepType>(steps);

  const validateCurrentStep = async () => {
    let isValid = false;

    switch (step) {
      case "business":
        isValid = await form.trigger([
          "storeName",
          "ownerName",
          "email",
          "phone",
          "businessDescription",
        ]);
        break;
      case "address":
        isValid = await form.trigger(["address", "city", "state", "zipCode"]);
        break;
      case "account":
        isValid = await form.trigger([
          "password",
          "confirmPassword",
          "agreeTerms",
        ]);
        break;
      default:
        isValid = false;
    }

    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    console.log("first");
    if (isValid) {
      next();
    } else {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before proceeding.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: StoreRegistrationValues) => {
    console.log("yes ");
    if (!isLastStep) {
      handleNext();
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(values, navigate, dispatch);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case "business":
        return <BusinessInfoSection form={form} />;
      case "address":
        return <AddressSection form={form} />;
      case "account":
        return <AccountSection form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header Card */}
        <div className="bg-white rounded-t-2xl shadow-xl p-6 md:p-8 border-b-4 border-blue-500">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
              <Store className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create Your Store Account
              </h1>
              <p className="text-gray-600 mt-2 text-sm md:text-base">
                Join our platform and start managing your store today
              </p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white px-6 md:px-8 py-4 shadow-xl">
          <RegistrationProgress currentStep={step} steps={formSteps} />
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-b-2xl shadow-xl p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step Content with Animation */}
              <div className="min-h-[400px] transition-all duration-300 ease-in-out">
                {renderStepContent()}
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t-2 border-gray-100">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span>Already have an account?</span>
                  <a 
                    href="/auth" 
                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
                  >
                    Log in →
                  </a>
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                  {!isFirstStep && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-2 hover:bg-gray-50 transition-all"
                      onClick={back}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}

                  {!isLastStep ? (
                    <Button
                      type="button"
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                      onClick={handleNext}
                      disabled={isSubmitting}
                    >
                      Next Step
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                    >
                      {isSubmitting ? "Creating Account..." : "🎉 Create Store Account"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>Secure & Encrypted</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>Free to Start</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreRegistration;