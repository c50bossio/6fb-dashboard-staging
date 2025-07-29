import { render, screen } from '@/test-utils/test-utils'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/Card'

describe('Card Component', () => {
  it('renders card with default styling', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Test content</p>
        </CardContent>
      </Card>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
    
    // Check default styling classes
    const card = screen.getByText('Test Title').closest('div').parentElement
    expect(card).toHaveClass('rounded-xl', 'border', 'bg-white', 'border-gray-200')
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Card variant="default">Default</Card>)
    let card = screen.getByText('Default')
    expect(card).toHaveClass('bg-white', 'border-gray-200', 'shadow-soft')

    rerender(<Card variant="elevated">Elevated</Card>)
    card = screen.getByText('Elevated')
    expect(card).toHaveClass('bg-white', 'border-gray-200', 'shadow-medium')

    rerender(<Card variant="ghost">Ghost</Card>)
    card = screen.getByText('Ghost')
    expect(card).toHaveClass('bg-transparent', 'border-transparent')

    rerender(<Card variant="outline">Outline</Card>)
    card = screen.getByText('Outline')
    expect(card).toHaveClass('bg-transparent', 'border-gray-200')
  })

  it('renders different hover effects correctly', () => {
    const { rerender } = render(<Card hover="none">No Hover</Card>)
    let card = screen.getByText('No Hover')
    expect(card).not.toHaveClass('hover:shadow-medium')

    rerender(<Card hover="lift">Lift Hover</Card>)
    card = screen.getByText('Lift Hover')
    expect(card).toHaveClass('hover:shadow-medium', 'hover:-translate-y-1')

    rerender(<Card hover="glow">Glow Hover</Card>)
    card = screen.getByText('Glow Hover')
    expect(card).toHaveClass('hover:shadow-strong', 'hover:border-brand-300')
  })

  it('renders different padding options correctly', () => {
    const { rerender } = render(<Card padding="none">No Padding</Card>)
    let card = screen.getByText('No Padding')
    expect(card).toHaveClass('p-0')

    rerender(<Card padding="sm">Small Padding</Card>)
    card = screen.getByText('Small Padding')
    expect(card).toHaveClass('p-4')

    rerender(<Card padding="md">Medium Padding</Card>)
    card = screen.getByText('Medium Padding')
    expect(card).toHaveClass('p-6')

    rerender(<Card padding="lg">Large Padding</Card>)
    card = screen.getByText('Large Padding')
    expect(card).toHaveClass('p-8')
  })

  it('applies custom className', () => {
    render(
      <Card className="custom-card">
        <Card.Content>Content</Card.Content>
      </Card>
    )

    const card = screen.getByText('Content').closest('[class*="custom-card"]')
    expect(card).toHaveClass('custom-card')
  })

  it('renders header components correctly', () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Card Title</Card.Title>
          <Card.Description>Card Description</Card.Description>
        </Card.Header>
      </Card>
    )

    const title = screen.getByText('Card Title')
    const description = screen.getByText('Card Description')

    expect(title).toBeInTheDocument()
    expect(description).toBeInTheDocument()

    // Check if they have appropriate heading semantics
    expect(title.tagName).toBe('H3')
  })

  it('renders content section correctly', () => {
    render(
      <Card>
        <Card.Content>
          <div>Complex content structure</div>
          <p>Paragraph content</p>
        </Card.Content>
      </Card>
    )

    expect(screen.getByText('Complex content structure')).toBeInTheDocument()
    expect(screen.getByText('Paragraph content')).toBeInTheDocument()
  })

  it('renders footer section correctly', () => {
    render(
      <Card>
        <Card.Content>Main content</Card.Content>
        <Card.Footer>
          <button>Footer button</button>
        </Card.Footer>
      </Card>
    )

    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /footer button/i })).toBeInTheDocument()
  })

  it('handles complex card structure', () => {
    render(
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>Complex Card</Card.Title>
            <button>Action</button>
          </div>
          <Card.Description>This is a complex card example</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </div>
        </Card.Content>
        <Card.Footer className="flex justify-between">
          <button>Cancel</button>
          <button>Save</button>
        </Card.Footer>
      </Card>
    )

    expect(screen.getByText('Complex Card')).toBeInTheDocument()
    expect(screen.getByText('This is a complex card example')).toBeInTheDocument()
    expect(screen.getByText('First paragraph')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('supports forwarding refs', () => {
    let cardRef
    const TestComponent = () => {
      cardRef = React.createRef()
      return (
        <Card ref={cardRef}>
          <Card.Content>Ref test</Card.Content>
        </Card>
      )
    }

    render(<TestComponent />)
    expect(cardRef.current).toBeInstanceOf(HTMLElement)
  })

  it('passes through data attributes', () => {
    render(
      <Card data-testid="test-card" data-analytics="card-component">
        <Card.Content>Data attributes test</Card.Content>
      </Card>
    )

    const card = screen.getByTestId('test-card')
    expect(card).toHaveAttribute('data-analytics', 'card-component')
  })

  it('applies proper styling classes', () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Styled Card</Card.Title>
        </Card.Header>
      </Card>
    )

    // Test for common card styling patterns used in the app
    const card = screen.getByText('Styled Card').closest('[class*="bg-"]')
    expect(card).toBeInTheDocument()
  })

  it('handles empty sections gracefully', () => {
    render(
      <Card>
        <Card.Header></Card.Header>
        <Card.Content></Card.Content>
        <Card.Footer></Card.Footer>
      </Card>
    )

    // Should render without errors even with empty sections
    expect(document.body).toBeInTheDocument()
  })

  it('supports nested cards', () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Parent Card</Card.Title>
        </Card.Header>
        <Card.Content>
          <Card>
            <Card.Header>
              <Card.Title>Nested Card</Card.Title>
            </Card.Header>
            <Card.Content>Nested content</Card.Content>
          </Card>
        </Card.Content>
      </Card>
    )

    expect(screen.getByText('Parent Card')).toBeInTheDocument()
    expect(screen.getByText('Nested Card')).toBeInTheDocument()
    expect(screen.getByText('Nested content')).toBeInTheDocument()
  })
})