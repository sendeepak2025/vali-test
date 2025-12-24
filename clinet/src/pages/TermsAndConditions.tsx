import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, Scale, CreditCard, Truck, AlertTriangle, Shield } from "lucide-react";

const TermsAndConditions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
              <p className="text-gray-500">Vali Produce - Wholesale Produce Distribution</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 prose prose-gray max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-blue-600" />
                1. Agreement to Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                By registering for an account, placing orders, or using any services provided by Vali Produce ("Company," "we," "us," or "our"), 
                you ("Customer," "Store," "you," or "your") agree to be bound by these Terms and Conditions. These terms constitute a legally 
                binding agreement between you and Vali Produce.
              </p>
              <p className="text-gray-700 leading-relaxed mt-3">
                If you are registering on behalf of a business entity, you represent that you have the authority to bind that entity to these terms.
              </p>
            </section>

            {/* Payment Terms */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-blue-600" />
                2. Payment Terms
              </h2>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Important Payment Information
                </h3>
              </div>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">2.1 Payment Due Date</h3>
              <p className="text-gray-700 leading-relaxed">
                All invoices are due and payable within <strong>seven (7) days</strong> from the date of invoice unless otherwise agreed 
                upon in writing. Payment terms may vary based on your assigned credit category and account standing.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">2.2 Accepted Payment Methods</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Cash on Delivery (COD)</li>
                <li>Company Check</li>
                <li>Certified Bank Check</li>
                <li>Wire Transfer / ACH</li>
                <li>Credit Card (subject to processing fees)</li>
              </ul>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">2.3 Late Payment Interest</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  Any payment not received by the due date shall accrue interest at a rate of <strong>1.5% per month</strong> (18% per annum) 
                  on the outstanding balance, calculated from the due date until the date of full payment.
                </p>
              </div>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">2.4 Returned Check Fee</h3>
              <p className="text-gray-700 leading-relaxed">
                A fee of <strong>$50.00</strong> will be charged for any check returned due to insufficient funds, closed account, 
                or any other reason. Repeated returned checks may result in revocation of check payment privileges.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">2.5 Credit Terms</h3>
              <p className="text-gray-700 leading-relaxed">
                Credit terms are extended at the sole discretion of Vali Produce and may be modified or revoked at any time. 
                New accounts may be required to pay COD until creditworthiness is established.
              </p>
            </section>

            {/* Product Terms */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Truck className="h-5 w-5 text-blue-600" />
                3. Orders and Delivery
              </h2>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">3.1 Order Acceptance</h3>
              <p className="text-gray-700 leading-relaxed">
                All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, 
                including but not limited to product availability, errors in pricing, or credit concerns.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">3.2 Pricing</h3>
              <p className="text-gray-700 leading-relaxed">
                Prices are subject to change without notice due to market conditions. The price at the time of order confirmation 
                will be honored for that specific order. Produce prices fluctuate based on seasonal availability and market conditions.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">3.3 Delivery</h3>
              <p className="text-gray-700 leading-relaxed">
                Delivery times are estimates only and are not guaranteed. Risk of loss and title for products pass to you upon delivery. 
                You are responsible for inspecting all products upon delivery and noting any damage or discrepancies on the delivery receipt.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">3.4 Claims and Returns</h3>
              <p className="text-gray-700 leading-relaxed">
                Due to the perishable nature of produce, all claims for damaged, defective, or incorrect products must be reported 
                within <strong>24 hours</strong> of delivery. Claims made after this period will not be honored. 
                Photographic evidence may be required for all claims.
              </p>
            </section>

            {/* Legal Terms */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
                4. Legal Terms and Collection
              </h2>

              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5 mb-4">
                <h3 className="font-bold text-red-800 text-lg mb-3">⚠️ IMPORTANT LEGAL NOTICE</h3>
                
                <h4 className="font-semibold text-red-800 mt-3 mb-2">4.1 Collection Actions</h4>
                <p className="text-red-800">
                  In the event of non-payment or default, Vali Produce reserves the right to pursue all available legal remedies, including but not limited to:
                </p>
                <ul className="list-disc pl-6 text-red-800 space-y-1 mt-2">
                  <li>Referral to collection agencies</li>
                  <li>Reporting to credit bureaus</li>
                  <li>Filing of civil lawsuits</li>
                  <li>Seeking judgment for the full amount owed plus interest, fees, and costs</li>
                  <li>Garnishment of wages or bank accounts (where permitted by law)</li>
                  <li>Placement of liens on property</li>
                </ul>

                <h4 className="font-semibold text-red-800 mt-4 mb-2">4.2 Attorney's Fees and Costs</h4>
                <p className="text-red-800">
                  In the event legal action is necessary to collect any amounts owed, you agree to pay all costs of collection, 
                  including but not limited to <strong>reasonable attorney's fees, court costs, and collection agency fees</strong>, 
                  which may be up to 35% of the outstanding balance.
                </p>

                <h4 className="font-semibold text-red-800 mt-4 mb-2">4.3 Governing Law and Jurisdiction</h4>
                <p className="text-red-800 font-medium">
                  These Terms and Conditions shall be governed by and construed in accordance with the laws of the 
                  <strong> State of Georgia</strong>. Any legal action or proceeding arising out of or relating to these terms 
                  shall be brought exclusively in the state or federal courts located in <strong>Fulton County, Atlanta, Georgia</strong>. 
                  You hereby consent to the personal jurisdiction of such courts and waive any objection to venue in such courts.
                </p>
              </div>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">4.4 Personal Guarantee</h3>
              <p className="text-gray-700 leading-relaxed">
                If you are registering on behalf of a business entity, you may be required to provide a personal guarantee 
                for all amounts owed. By agreeing to these terms, principals and owners of the business entity agree to be 
                personally liable for all debts incurred.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">4.5 Waiver of Jury Trial</h3>
              <p className="text-gray-700 leading-relaxed">
                TO THE FULLEST EXTENT PERMITTED BY LAW, EACH PARTY WAIVES ANY RIGHT TO A JURY TRIAL IN ANY LEGAL PROCEEDING 
                ARISING OUT OF OR RELATING TO THESE TERMS OR THE TRANSACTIONS CONTEMPLATED HEREBY.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">4.6 Severability</h3>
              <p className="text-gray-700 leading-relaxed">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or 
                eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
              </p>
            </section>

            {/* Account Terms */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Account Terms</h2>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">5.1 Account Security</h3>
              <p className="text-gray-700 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">5.2 Account Suspension</h3>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for any reason, including but not limited to 
                non-payment, violation of these terms, or suspected fraudulent activity.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">5.3 Accurate Information</h3>
              <p className="text-gray-700 leading-relaxed">
                You agree to provide accurate, current, and complete information during registration and to update such 
                information to keep it accurate, current, and complete.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VALI PRODUCE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES, 
                RESULTING FROM YOUR USE OF OUR SERVICES OR PRODUCTS.
              </p>
              <p className="text-gray-700 leading-relaxed mt-3">
                Our total liability for any claims arising from these terms or your use of our services shall not exceed 
                the total amount paid by you to us in the twelve (12) months preceding the claim.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                For questions about these Terms and Conditions, please contact us at:
              </p>
              <div className="bg-gray-100 rounded-lg p-4 mt-3">
                <p className="font-semibold">Vali Produce</p>
                <p>Atlanta, Georgia</p>
                <p>Email: legal@valiproduce.com</p>
                <p>Phone: (555) 123-4567</p>
              </div>
            </section>
          </CardContent>
        </Card>

        {/* Acceptance Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <p className="text-blue-800 text-center">
              By creating an account or placing an order with Vali Produce, you acknowledge that you have read, understood, 
              and agree to be bound by these Terms and Conditions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
