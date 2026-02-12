import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Mail, Save, Send } from "lucide-react";

interface EmailControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sendEmail: boolean) => void;
  type: 'create' | 'update';
  loading?: boolean;
}

export const EmailControlModal: React.FC<EmailControlModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  loading = false
}) => {
  const [selectedOption, setSelectedOption] = React.useState<'only' | 'with-email'>('only');

  const handleConfirm = () => {
    onConfirm(selectedOption === 'with-email');
  };

  const actionText = type === 'create' ? 'Create' : 'Update';
  const actionTextLower = type === 'create' ? 'create' : 'update';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {actionText} Order Options
          </DialogTitle>
          <DialogDescription>
            Choose whether to send email notifications when you {actionTextLower} this order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={selectedOption}
            onValueChange={(value) => setSelectedOption(value as 'only' | 'with-email')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="only" id="only" />
              <Label htmlFor="only" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="font-medium">{actionText} Only</div>
                    <div className="text-sm text-gray-500">
                      {actionText} the order without sending any email notifications
                    </div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="with-email" id="with-email" />
              <Label htmlFor="with-email" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">{actionText} & Email</div>
                    <div className="text-sm text-gray-500">
                      {actionText} the order and send email notifications to the customer
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                {selectedOption === 'with-email' ? (
                  <Send className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {actionText} Order
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};