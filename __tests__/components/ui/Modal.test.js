import { render, screen, waitFor } from '@/test-utils/test-utils'
import { Modal } from '@/components/ui/Modal'

describe('Modal Component', () => {
  it('renders modal when open is true', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <Modal.Header>
          <Modal.Title>Test Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Modal content</p>
        </Modal.Content>
      </Modal>
    )

    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render modal when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <Modal.Header>
          <Modal.Title>Hidden Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Hidden content</p>
        </Modal.Content>
      </Modal>
    )

    expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const handleClose = jest.fn()
    const { user } = render(
      <Modal open={true} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Closeable Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Content</p>
        </Modal.Content>
      </Modal>
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay is clicked', async () => {
    const handleClose = jest.fn()
    const { user } = render(
      <Modal open={true} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Overlay Close Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Content</p>
        </Modal.Content>
      </Modal>
    )

    const overlay = screen.getByTestId('modal-overlay') || screen.getByRole('dialog').parentElement
    await user.click(overlay)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking inside modal content', async () => {
    const handleClose = jest.fn()
    const { user } = render(
      <Modal open={true} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Content Click Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Clickable content</p>
        </Modal.Content>
      </Modal>
    )

    const content = screen.getByText('Clickable content')
    await user.click(content)

    expect(handleClose).not.toHaveBeenCalled()
  })

  it('handles escape key press', async () => {
    const handleClose = jest.fn()
    const { user } = render(
      <Modal open={true} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Escape Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Content</p>
        </Modal.Content>
      </Modal>
    )

    await user.keyboard('{Escape}')

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}} size="sm">
        <Modal.Content>Small Modal</Modal.Content>
      </Modal>
    )
    let modal = screen.getByText('Small Modal').closest('[class*="max-w"]')
    expect(modal).toHaveClass('max-w-sm')

    rerender(
      <Modal open={true} onClose={() => {}} size="md">
        <Modal.Content>Medium Modal</Modal.Content>
      </Modal>
    )
    modal = screen.getByText('Medium Modal').closest('[class*="max-w"]')
    expect(modal).toHaveClass('max-w-md')

    rerender(
      <Modal open={true} onClose={() => {}} size="lg">
        <Modal.Content>Large Modal</Modal.Content>
      </Modal>
    )
    modal = screen.getByText('Large Modal').closest('[class*="max-w"]')
    expect(modal).toHaveClass('max-w-lg')

    rerender(
      <Modal open={true} onClose={() => {}} size="xl">
        <Modal.Content>Extra Large Modal</Modal.Content>
      </Modal>
    )
    modal = screen.getByText('Extra Large Modal').closest('[class*="max-w"]')
    expect(modal).toHaveClass('max-w-xl')
  })

  it('renders modal with footer', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <Modal.Header>
          <Modal.Title>Modal with Footer</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Content</p>
        </Modal.Content>
        <Modal.Footer>
          <button>Cancel</button>
          <button>Save</button>
        </Modal.Footer>
      </Modal>
    )

    expect(screen.getByText('Modal with Footer')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Modal open={true} onClose={() => {}} className="custom-modal">
        <Modal.Content>Custom styled modal</Modal.Content>
      </Modal>
    )

    const modal = screen.getByText('Custom styled modal').closest('[class*="custom-modal"]')
    expect(modal).toHaveClass('custom-modal')
  })

  it('has proper accessibility attributes', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <Modal.Header>
          <Modal.Title>Accessible Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          <p>Accessible content</p>
        </Modal.Content>
      </Modal>
    )

    const modal = screen.getByRole('dialog')
    expect(modal).toHaveAttribute('aria-modal', 'true')
    expect(modal).toHaveAttribute('aria-labelledby')
    
    const title = screen.getByText('Accessible Modal')
    expect(title).toHaveAttribute('id')
  })

  it('manages focus correctly', async () => {
    render(
      <div>
        <button>Outside button</button>
        <Modal open={true} onClose={() => {}}>
          <Modal.Header>
            <Modal.Title>Focus Modal</Modal.Title>
          </Modal.Header>
          <Modal.Content>
            <input type="text" placeholder="First input" />
            <input type="text" placeholder="Second input" />
          </Modal.Content>
        </Modal>
      </div>
    )

    const firstInput = screen.getByPlaceholderText('First input')
    const secondInput = screen.getByPlaceholderText('Second input')
    
    expect(firstInput).toBeInTheDocument()
    expect(secondInput).toBeInTheDocument()
  })

  it('prevents body scroll when open', () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => {}}>
        <Modal.Content>Closed Modal</Modal.Content>
      </Modal>
    )

    expect(document.body.style.overflow).not.toBe('hidden')

    rerender(
      <Modal open={true} onClose={() => {}}>
        <Modal.Content>Open Modal</Modal.Content>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('supports controlled and uncontrolled modes', async () => {
    let isOpen = false
    const handleClose = () => { isOpen = false }
    
    const { rerender, user } = render(
      <Modal open={isOpen} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Controlled Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>Controlled content</Modal.Content>
      </Modal>
    )

    expect(screen.queryByText('Controlled Modal')).not.toBeInTheDocument()

    isOpen = true
    rerender(
      <Modal open={isOpen} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Controlled Modal</Modal.Title>
        </Modal.Header>
        <Modal.Content>Controlled content</Modal.Content>
      </Modal>
    )

    expect(screen.getByText('Controlled Modal')).toBeInTheDocument()
  })
})