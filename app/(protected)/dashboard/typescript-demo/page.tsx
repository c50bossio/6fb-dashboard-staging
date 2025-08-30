'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { 
  ArrowRight, 
  Check, 
  Download, 
  Mail, 
  Phone, 
  Plus, 
  Settings, 
  TrendingUp,
  User,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/Button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  FormActions,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { StatsCard } from '@/components/ui/StatsCard'

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

export default function TypeScriptDemoPage() {
  const [loading, setLoading] = useState(false)
  const [buttonVariant, setButtonVariant] = useState<'default' | 'primary' | 'secondary' | 'success' | 'warning'>('default')

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('Form submitted:', data)
    setLoading(false)
    form.reset()
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">TypeScript Components Demo</h1>
        <p className="text-muted-foreground">
          Showcasing our new TypeScript UI components with full type safety
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value="$12,456"
          description="12% increase from last month"
          icon={<DollarSign className="h-4 w-4" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Customers"
          value="2,345"
          description="New customers this month"
          icon={<Users className="h-4 w-4" />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Appointments"
          value="189"
          description="Scheduled this week"
          icon={<Calendar className="h-4 w-4" />}
          trend={{ value: 5, isPositive: false }}
        />
        <StatsCard
          title="Growth Rate"
          value="24.5%"
          description="Year over year"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ value: 24.5, isPositive: true }}
        />
      </div>

      {/* Button Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Button Components</CardTitle>
          <CardDescription>
            Different button variants, sizes, and states with TypeScript support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Button Variants */}
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>

          {/* Button Sizes */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
            <Button size="icon"><Settings className="h-4 w-4" /></Button>
          </div>

          {/* Button States */}
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled</Button>
            <Button loading loadingText="Loading...">With Loading</Button>
            <Button icon={<Plus className="h-4 w-4" />}>With Icon</Button>
            <Button icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
              Icon Right
            </Button>
            <Button fullWidth variant="primary">Full Width Button</Button>
          </div>
        </CardContent>
      </Card>

      {/* Input Components */}
      <Card>
        <CardHeader>
          <CardTitle>Input Components</CardTitle>
          <CardDescription>
            Various input states and configurations with validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Basic Input"
              placeholder="Enter text..."
              helperText="This is a helper text"
            />
            <Input
              label="Required Input"
              placeholder="This field is required"
              required
            />
            <Input
              label="With Error"
              placeholder="Enter email"
              error="Please enter a valid email address"
            />
            <Input
              label="Success State"
              placeholder="Valid input"
              value="john@example.com"
              success
            />
            <Input
              label="With Left Icon"
              placeholder="Enter email"
              leftIcon={Mail}
              type="email"
            />
            <Input
              label="Password Input"
              placeholder="Enter password"
              type="password"
            />
            <Input
              label="Disabled Input"
              placeholder="Cannot edit"
              disabled
              value="Disabled value"
            />
            <Input
              label="Phone Input"
              placeholder="(123) 456-7890"
              leftIcon={Phone}
              type="tel"
            />
          </div>
        </CardContent>
      </Card>

      {/* Card Variants */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Card Components</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Standard card with shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is the default card variant with a subtle shadow.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>

          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Outlined Card</CardTitle>
              <CardDescription>Border only, no shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This card has only a border without shadow effects.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm">Learn More</Button>
            </CardFooter>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>Prominent shadow for emphasis</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This card has a larger shadow for more visual prominence.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="primary" size="sm">Get Started</Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Form Example */}
      <Card>
        <CardHeader>
          <CardTitle>Form with Validation</CardTitle>
          <CardDescription>
            Complete form example using react-hook-form with TypeScript and Zod validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormSection 
                title="Personal Information"
                description="Enter your personal details below"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John Doe"
                          leftIcon={User}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="john@example.com"
                            leftIcon={Mail}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="(123) 456-7890"
                            leftIcon={Phone}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              <FormSection
                title="Security"
                description="Create a secure password for your account"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Enter password"
                          />
                        </FormControl>
                        <FormDescription>
                          Must be at least 8 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Confirm password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              <FormActions>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  loading={loading}
                  loadingText="Creating Account..."
                  icon={<Check className="h-4 w-4" />}
                >
                  Create Account
                </Button>
              </FormActions>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Interactive Card */}
      <Card variant="interactive" className="cursor-pointer">
        <CardHeader
          title="Interactive Card"
          description="Click me to see the hover effect"
          action={
            <Button size="sm" variant="ghost">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          }
        />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This card has an interactive hover effect and a custom action button in the header.
            Perfect for clickable dashboard widgets or selectable items.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}