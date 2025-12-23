"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must include uppercase, lowercase, number and special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

const ResetPassword = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)

  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        setTokenValid(false)
        return
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/auth/verify-reset-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email }),
        })

        setTokenValid(response.ok)
      } catch (error) {
        setTokenValid(false)
      }
    }

    verifyToken()
  }, [token, email])

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 12.5
    if (/[@$!%*?&]/.test(password)) strength += 12.5
    return strength
  }

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token || !email) return

    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password: values.password,
        }),
      })

      if (response.ok) {
        setResetSuccess(true)
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset successfully. You can now login with your new password.",
        })
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth')
        }, 3000)
      } else {
        throw new Error("Failed to reset password")
      }
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Failed to reset password. Please try again or request a new reset link.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while verifying token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This password reset link is invalid or has expired. 
              Please request a new password reset link.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Password Reset Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Your password has been reset successfully. 
              You will be redirected to the login page shortly.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <KeyRound className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle>Reset Your Password</CardTitle>
          <p className="text-gray-600">Enter your new password below</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Enter new password" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e)
                            setPasswordTouched(true)
                            setPasswordStrength(calculatePasswordStrength(e.target.value))
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {/* Password Strength Progress Bar */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 h-2 rounded">
                        <div
                          className={`h-2 rounded transition-all duration-300 ${
                            passwordStrength === 100
                              ? "bg-green-500"
                              : passwordTouched
                              ? "bg-red-500"
                              : "bg-gray-300"
                          }`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                      {passwordTouched && passwordStrength < 100 && (
                        <p className="text-red-500 text-sm mt-1">
                          Password must include uppercase, lowercase, number, special character, and at least 8 characters
                        </p>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Confirm new password" 
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Resetting Password..." : <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                  </>}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
