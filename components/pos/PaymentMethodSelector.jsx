'use client'

import { CreditCard, DollarSign, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'

export function PaymentMethodSelector({ isOpen, onClose, onSelectMethod, totalAmount }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Select Payment Method
            <span className="ml-auto text-lg font-bold text-brand-600">
              ${totalAmount.toFixed(2)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Cash Payment */}
          <button
            onClick={() => onSelectMethod('cash')}
            className="p-6 border-2 rounded-lg hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-all group text-center"
          >
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-green-600 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg mb-1">Cash</h3>
            <p className="text-sm text-muted-foreground mb-2">
              No fees
            </p>
            <div className="text-xl font-bold text-green-600">
              ${totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Exact amount due
            </p>
          </button>

          {/* Card Payment (Terminal) */}
          <button
            onClick={() => onSelectMethod('terminal')}
            className="p-6 border-2 rounded-lg hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all group text-center"
          >
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-brand-600 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg mb-1">Card</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Stripe Terminal
            </p>
            <div className="text-xl font-bold text-brand-600">
              ${(totalAmount + (totalAmount * 0.029 + 0.30)).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Includes 2.9% + 30¢ processing fee
            </p>
          </button>
        </div>

        <div className="border-t pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
