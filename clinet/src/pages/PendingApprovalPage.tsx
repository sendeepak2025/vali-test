import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Clock, Mail, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PendingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  // Redirect approved stores to dashboard
  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    if (user?.role !== "store") {
      // Non-store users shouldn't see this page
      navigate("/dashboard");
      return;
    }

    if (user?.approvalStatus === "approved") {
      navigate("/store/dashboard");
    }
  }, [user, token, navigate]);

  // Handle rejected status
  if (user?.approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-red-100 w-fit">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Registration Rejected</CardTitle>
            <CardDescription className="text-base mt-2">
              Unfortunately, your store registration has been rejected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {user?.rejectionReason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Reason</AlertTitle>
                <AlertDescription>{user.rejectionReason}</AlertDescription>
              </Alert>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">What can you do?</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Review the rejection reason above</li>
                <li>• Contact our support team for more information</li>
                <li>• Submit a new registration with corrected information</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Contact Support</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>support@valiproduce.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>(555) 123-4567</span>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/store-registration")}
            >
              Submit New Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending status view
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-amber-100 w-fit">
            <Clock className="h-12 w-12 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Registration Pending Approval</CardTitle>
          <CardDescription className="text-base mt-2">
            Thank you for registering! Your store account is currently under review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Registration Reference */}
          {user?.registrationRef && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Your Registration Reference</p>
              <p className="text-xl font-mono font-bold text-primary">{user.registrationRef}</p>
              <p className="text-xs text-gray-500 mt-1">Please save this for your records</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              What happens next?
            </h3>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Registration submitted successfully</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>Our team reviews your application (1-2 business days)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">3</span>
                <span>You'll receive an email notification with the decision</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">4</span>
                <span>Once approved, you'll have full access to your dashboard</span>
              </li>
            </ol>
          </div>

          {/* Expected Timeline */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Expected Timeline</AlertTitle>
            <AlertDescription>
              Most applications are reviewed within 1-2 business days. You'll receive an email at{" "}
              <span className="font-medium">{user?.email}</span> once a decision is made.
            </AlertDescription>
          </Alert>

          {/* Contact Information */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@valiproduce.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>(555) 123-4567</span>
              </div>
            </div>
          </div>

          {/* Store Info Summary */}
          {user?.storeName && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Store Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Store Name:</div>
                <div className="font-medium">{user.storeName}</div>
                {user?.ownerName && (
                  <>
                    <div className="text-gray-500">Owner:</div>
                    <div className="font-medium">{user.ownerName}</div>
                  </>
                )}
                <div className="text-gray-500">Email:</div>
                <div className="font-medium">{user.email}</div>
              </div>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              // Refresh the page to check for status updates
              window.location.reload();
            }}
          >
            Check Status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApprovalPage;
