"use client"

import { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react"

interface LoggedInPasswordResetProps {
  isOpen: boolean
  onClose: () => void
}

const LoggedInPasswordReset = ({ isOpen, onClose }: LoggedInPasswordResetProps) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const user = useSelector((state: RootState) => state.auth?.user ?? null)

  const handleSendResetLink = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found. Please try logging in again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      })

      if (response.ok) {
        setEmailSent(true)
        toast({
          title: "Reset Link Sent",
          description: "Password reset link has been sent to your email address.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send reset email")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmailSent(false)
    onClose()
  }

  if (!user) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            {emailSent 
              ? "Check your email for the reset link"
              : "We'll send a password reset link to your registered email"
            }
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Email Sent!</h3>
            <p className="text-gray-600 mb-2">
              We've sent a password reset link to:
            </p>
            <p className="font-semibold text-blue-600 mb-4">{user.email}</p>
            <p className="text-sm text-gray-500 mb-4">
              Please check your inbox and follow the instructions. The link will expire in 1 hour.
            </p>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Password reset link will be sent to:
                  </p>
                  <p className="text-blue-900 font-semibold">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Reset link expires in 1 hour</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>You'll receive an email with reset instructions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Click the link in email to reset your password</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSendResetLink}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default LoggedInPasswordReset