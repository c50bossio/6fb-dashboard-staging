'use client'

import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Wifi, 
  CreditCard, 
  Smartphone, 
  Monitor,
  Download,
  Settings,
  Key,
  Shield,
  ArrowRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

interface SetupStep {
  id: string
  title: string
  description: string
  completed: boolean
  icon: React.ReactNode
}

export function StripeTerminalSetup({ barbershopId }: { barbershopId: string }) {
  const [activeTab, setActiveTab] = useState('requirements')
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'stripe-account',
      title: 'Create Stripe Account',
      description: 'Sign up for a Stripe account or connect existing one',
      completed: false,
      icon: <Key className="h-4 w-4" />
    },
    {
      id: 'terminal-reader',
      title: 'Order Terminal Reader',
      description: 'Purchase or rent a Stripe Terminal device',
      completed: false,
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      id: 'connect-reader',
      title: 'Connect Reader',
      description: 'Set up and connect your terminal reader',
      completed: false,
      icon: <Wifi className="h-4 w-4" />
    },
    {
      id: 'test-payment',
      title: 'Test Payment',
      description: 'Process a test transaction to verify setup',
      completed: false,
      icon: <CheckCircle2 className="h-4 w-4" />
    }
  ])
  const { toast } = useToast()

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(null), 2000)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        variant: "default"
      })
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive"
      })
    }
  }

  const markStepComplete = (stepId: string) => {
    setSetupSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      )
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Terminal Setup Guide
        </CardTitle>
        <CardDescription>
          Complete setup guide for accepting in-person card payments with Stripe Terminal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="software">Software</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What You'll Need</h3>
              
              <div className="grid gap-4">
                {/* Stripe Account */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">1. Stripe Account</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          You need an active Stripe account with Terminal access enabled
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open('https://dashboard.stripe.com/register', '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Create Account
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open('https://dashboard.stripe.com/terminal/overview', '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Terminal Dashboard
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Terminal Reader */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">2. Terminal Reader</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Choose a Stripe Terminal reader that fits your needs
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium">BBPOS WisePOS E</p>
                              <p className="text-xs text-gray-500">WiFi • All-in-one • $249</p>
                            </div>
                            <Badge>Recommended</Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium">Stripe Reader M2</p>
                              <p className="text-xs text-gray-500">Bluetooth • Mobile • $59</p>
                            </div>
                            <Badge variant="outline">Budget</Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium">Verifone P400</p>
                              <p className="text-xs text-gray-500">Ethernet • Countertop • $299</p>
                            </div>
                            <Badge variant="outline">Premium</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Network Requirements */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Wifi className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">3. Network Requirements</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Ensure your network meets these requirements
                        </p>
                        <ul className="text-sm space-y-1">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Stable internet connection (WiFi or Ethernet)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Port 443 open for HTTPS traffic
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            2.4GHz WiFi network (for most readers)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            WPA2 security or higher
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Hardware Setup Tab */}
          <TabsContent value="hardware" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Hardware Setup Instructions</h3>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Setup instructions vary by device. Select your reader model below.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {/* WisePOS E Setup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">BBPOS WisePOS E Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5">1</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Unbox and Power On</p>
                          <p className="text-sm text-muted-foreground">
                            Connect the power adapter and press the power button for 3 seconds
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5">2</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Connect to WiFi</p>
                          <p className="text-sm text-muted-foreground">
                            Go to Settings → Network → WiFi and select your network
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5">3</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Register Device</p>
                          <p className="text-sm text-muted-foreground">
                            Navigate to Admin → Register and enter your registration code
                          </p>
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open('https://dashboard.stripe.com/terminal/locations', '_blank')}
                            >
                              Get Registration Code
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5">4</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Update Software</p>
                          <p className="text-sm text-muted-foreground">
                            Go to Admin → Software Update and install any available updates
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* M2 Reader Setup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Stripe Reader M2 Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5">1</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Charge the Reader</p>
                          <p className="text-sm text-muted-foreground">
                            Use the included USB-C cable to charge for at least 2 hours
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5">2</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Enable Bluetooth</p>
                          <p className="text-sm text-muted-foreground">
                            Press and hold the power button until the Bluetooth LED blinks
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5">3</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Pair with Device</p>
                          <p className="text-sm text-muted-foreground">
                            The reader will appear in the POS system when you open Terminal Payment
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Software Setup Tab */}
          <TabsContent value="software" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Software Configuration</h3>
              
              <div className="space-y-4">
                {/* API Keys */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">1. Configure API Keys</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        Add these keys to your environment variables (.env file)
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Stripe Secret Key</label>
                        <div className="flex gap-2 mt-1">
                          <code className="flex-1 p-2 bg-gray-100 rounded text-xs">
                            STRIPE_SECRET_KEY=sk_live_...
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard('STRIPE_SECRET_KEY=sk_live_...', 'Secret Key')}
                          >
                            {copiedText === 'Secret Key' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Stripe Publishable Key</label>
                        <div className="flex gap-2 mt-1">
                          <code className="flex-1 p-2 bg-gray-100 rounded text-xs">
                            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...', 'Publishable Key')}
                          >
                            {copiedText === 'Publishable Key' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Terminal Location ID</label>
                        <div className="flex gap-2 mt-1">
                          <code className="flex-1 p-2 bg-gray-100 rounded text-xs">
                            STRIPE_TERMINAL_LOCATION_ID=tml_...
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard('STRIPE_TERMINAL_LOCATION_ID=tml_...', 'Location ID')}
                          >
                            {copiedText === 'Location ID' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full"
                      onClick={() => window.open('https://dashboard.stripe.com/apikeys', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get API Keys from Stripe Dashboard
                    </Button>
                  </CardContent>
                </Card>

                {/* Location Setup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">2. Create Terminal Location</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Terminal readers must be assigned to a location in your Stripe account
                    </p>
                    
                    <div className="bg-gray-50 p-3 rounded space-y-2">
                      <p className="text-sm font-medium">Quick Setup Commands:</p>
                      <code className="block p-2 bg-white rounded text-xs">
                        curl https://api.stripe.com/v1/terminal/locations \
                        <br />  -u sk_live_YOUR_KEY: \
                        <br />  -d "display_name=Your Barbershop Name" \
                        <br />  -d "address[line1]=123 Main St" \
                        <br />  -d "address[city]=Your City" \
                        <br />  -d "address[state]=CA" \
                        <br />  -d "address[country]=US" \
                        <br />  -d "address[postal_code]=12345"
                      </code>
                    </div>
                    
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => window.open('https://dashboard.stripe.com/terminal/locations', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Locations in Dashboard
                    </Button>
                  </CardContent>
                </Card>

                {/* Install Dependencies */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">3. Install Dependencies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Install the Stripe Terminal SDK in your project
                    </p>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <code className="text-xs">
                        npm install @stripe/terminal-js stripe
                      </code>
                    </div>
                    
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        The Terminal SDK is already included in this POS system
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Your Setup</h3>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Use Stripe's test mode and test cards to verify your setup before going live
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {/* Test Mode */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Enable Test Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Toggle to test mode in your Stripe Dashboard to use test cards
                      </p>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded p-3">
                        <p className="text-sm font-medium text-amber-800 mb-2">Test Cards:</p>
                        <div className="space-y-1 text-xs text-amber-700">
                          <div>• <code>4242 4242 4242 4242</code> - Successful payment</div>
                          <div>• <code>4000 0000 0000 9995</code> - Declined (insufficient funds)</div>
                          <div>• <code>4000 0000 0000 0002</code> - Declined (generic)</div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full"
                      onClick={() => window.open('https://dashboard.stripe.com/test/terminal/overview', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Test Dashboard
                    </Button>
                  </CardContent>
                </Card>

                {/* Test Checklist */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Testing Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {setupSteps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => markStepComplete(step.id)}
                        >
                          <div className={`p-1 rounded-full ${
                            step.completed ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {step.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              step.completed ? 'line-through text-gray-500' : ''
                            }`}>
                              {step.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {setupSteps.every(step => step.completed) && (
                      <Alert className="mt-4 border-green-200 bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Congratulations! Your Stripe Terminal is ready for production use.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Go Live */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ready to Go Live?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Once testing is complete, switch to live mode to start accepting real payments
                    </p>
                    
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Replace test API keys with live keys</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Ensure Terminal location is created in live mode</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Register readers with live location</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Process a small live transaction to verify</span>
                      </li>
                    </ul>
                    
                    <Button className="w-full">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Activate Live Mode
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-blue-900">Need Help?</p>
              <p className="text-sm text-blue-700 mt-1">
                Contact Stripe support at{' '}
                <a 
                  href="https://support.stripe.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  support.stripe.com
                </a>
                {' '}or reach out to our support team for assistance with setup.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}