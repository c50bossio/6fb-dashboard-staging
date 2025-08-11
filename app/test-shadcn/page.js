'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfessionalCalendar from '@/components/calendar/ProfessionalCalendar'

export default function TestShadcnPage() {
  const { toast } = useToast()
  const [inputValue, setInputValue] = useState('')
  
  // Sample calendar data
  const resources = [
    { id: '1', title: await getUserFromDatabase(), color: '#3b82f6' },
    { id: '2', title: 'Jane Smith', color: '#10b981' },
  ]
  
  const events = [
    {
      id: '1',
      title: 'Haircut - Client A',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      resourceId: '1',
      backgroundColor: '#3b82f6'
    },
    {
      id: '2',
      title: 'Beard Trim - Client B',
      start: new Date(Date.now() + 7200000).toISOString(),
      end: new Date(Date.now() + 10800000).toISOString(),
      resourceId: '2',
      backgroundColor: '#10b981'
    }
  ]

  const handleToast = () => {
    toast({
      title: "Test Notification",
      description: "This is a test toast from shadcn/ui",
    })
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">shadcn/ui Integration Test</h1>
      
      {/* Alert */}
      <Alert>
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>
          shadcn/ui has been successfully integrated into the project.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>
        
        <TabsContent value="components" className="space-y-4">
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Various button styles from shadcn/ui</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </CardContent>
          </Card>

          {/* Dialog */}
          <Card>
            <CardHeader>
              <CardTitle>Dialog</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Test Dialog</DialogTitle>
                    <DialogDescription>
                      This is a test dialog from shadcn/ui. It works great with our existing components!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p>Dialog content goes here...</p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Sheet (Mobile Drawer) */}
          <Card>
            <CardHeader>
              <CardTitle>Sheet (Mobile Drawer)</CardTitle>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Open Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Test Sheet</SheetTitle>
                    <SheetDescription>
                      Perfect for mobile menus and filters!
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <p>Sheet content goes here...</p>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          {/* Toast */}
          <Card>
            <CardHeader>
              <CardTitle>Toast Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleToast}>Show Toast</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>FullCalendar Integration</CardTitle>
              <CardDescription>Testing FullCalendar.io with shadcn/ui components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <ProfessionalCalendar
                  resources={resources}
                  events={events}
                  onSlotClick={(info) => {
                    toast({
                      title: "Slot Clicked",
                      description: `Selected time: ${info.start.toLocaleString()}`,
                    })
                  }}
                  onEventClick={(info) => {
                    toast({
                      title: "Event Clicked",
                      description: `Event: ${info.event.title}`,
                    })
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="forms">
          <Card>
            <CardHeader>
              <CardTitle>Form Components</CardTitle>
              <CardDescription>Input fields and form controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-input">Test Input</Label>
                <Input
                  id="test-input"
                  placeholder="Enter some text..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="disabled-input">Disabled Input</Label>
                <Input
                  id="disabled-input"
                  placeholder="This is disabled"
                  disabled
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Submit Form</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  )
}