import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Default templates if database tables don't exist yet
const DEFAULT_TEMPLATES = {
  birthday: {
    sms: 'Happy Birthday {{customer_name}}! 🎉 Celebrate with us and get {{discount_description}}. Book your special day appointment today! Valid for {{discount_expiry_days}} days.',
    email: {
      subject: 'Happy Birthday from {{shop_name}}! 🎂',
      content: `Dear {{customer_name}},

Happy Birthday! 🎉

We hope your special day is filled with joy and happiness. To help you celebrate, we're offering you {{discount_description}} on your next visit!

{{discount_details}}

Book your birthday appointment today and let us help you look and feel your best on your special day.

With birthday wishes,
The {{shop_name}} Team

Book Now: {{booking_link}}`
    }
  },
  anniversary: {
    sms: 'Happy Anniversary {{customer_name}}! 🎊 It\'s been {{years_as_customer}} year(s) since your first visit. Celebrate with {{discount_description}}! Book today!',
    email: {
      subject: 'Celebrating {{years_as_customer}} Year(s) Together!',
      content: `Dear {{customer_name}},

Happy Anniversary! 🎊

Can you believe it's been {{years_as_customer}} year(s) since your first visit to {{shop_name}}? Time flies when you're having great hair days!

We're so grateful for your loyalty and trust in us. To celebrate this milestone, we're offering you {{discount_description}}.

{{discount_details}}

Thank you for being such an amazing customer. Here's to many more years of great looks together!

With appreciation,
The {{shop_name}} Team

Book Now: {{booking_link}}`
    }
  }
};

// GET - Fetch birthday/anniversary message templates
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const templateType = searchParams.get('type') || 'birthday'; // 'birthday' or 'anniversary'
    const messageType = searchParams.get('message_type'); // 'sms', 'email', or null for both
    
    if (!barbershopId) {
      return NextResponse.json({
        templates: [],
        error: 'barbershop_id parameter is required'
      }, { status: 400 });
    }

    try {
      // Try to fetch templates from database
      let query = supabase
        .from('birthday_templates')
        .select('*')
        .or(`barbershop_id.eq.${barbershopId},barbershop_id.eq.default`)
        .eq('template_type', templateType)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (messageType) {
        query = query.eq('message_type', messageType);
      }

      const { data: templates, error } = await query;

      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          // Return default templates if database tables don't exist
          return NextResponse.json({
            templates: getDefaultTemplates(templateType, messageType),
            message: 'Using default templates. Database migration required for custom templates.',
            migration_needed: true
          });
        }
        
        return NextResponse.json({
          error: 'Failed to fetch templates',
          details: error.message
        }, { status: 500 });
      }

      if (!templates || templates.length === 0) {
        return NextResponse.json({
          templates: getDefaultTemplates(templateType, messageType),
          message: 'No custom templates found. Using defaults.'
        });
      }

      const formattedTemplates = templates.map(template => ({
        ...template,
        last_used_display: template.last_used_at 
          ? new Date(template.last_used_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : 'Never',
        discount_display: template.includes_discount 
          ? `${template.discount_type === 'percentage' ? template.discount_value + '%' : '$' + template.discount_value} off`
          : 'No discount'
      }));

      return NextResponse.json({
        templates: formattedTemplates,
        total: formattedTemplates.length,
        template_type: templateType
      });

    } catch (err) {
      // Fallback to default templates
      return NextResponse.json({
        templates: getDefaultTemplates(templateType, messageType),
        message: 'Database not available. Using default templates.',
        migration_needed: true
      });
    }

  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new birthday/anniversary template
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      barbershop_id,
      template_name,
      template_type,
      message_type,
      subject_line,
      message_content,
      includes_discount,
      discount_type,
      discount_value,
      discount_description,
      discount_expiry_days,
      is_default
    } = body;

    if (!barbershop_id || !template_name || !template_type || !message_type || !message_content) {
      return NextResponse.json({
        error: 'barbershop_id, template_name, template_type, message_type, and message_content are required'
      }, { status: 400 });
    }

    const templateData = {
      barbershop_id,
      template_name,
      template_type,
      message_type,
      subject_line: subject_line || null,
      message_content,
      includes_discount: includes_discount || false,
      discount_type: discount_type || null,
      discount_value: discount_value || 0,
      discount_description: discount_description || null,
      discount_expiry_days: discount_expiry_days || 30,
      is_default: is_default || false,
      is_active: true
    };

    try {
      const { data: template, error } = await supabase
        .from('birthday_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          return NextResponse.json({
            error: 'Template creation not available. Database migration required.',
            migration_needed: true
          }, { status: 400 });
        }
        
        return NextResponse.json({
          error: 'Failed to create template',
          details: error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Template created successfully',
        template: template
      });

    } catch (err) {
      return NextResponse.json({
        error: 'Template creation not available. Database migration required.',
        migration_needed: true
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update existing template
export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      template_id,
      template_name,
      message_content,
      subject_line,
      includes_discount,
      discount_type,
      discount_value,
      discount_description,
      is_active
    } = body;

    if (!template_id) {
      return NextResponse.json({
        error: 'template_id is required'
      }, { status: 400 });
    }

    const updateData = {};
    if (template_name !== undefined) updateData.template_name = template_name;
    if (message_content !== undefined) updateData.message_content = message_content;
    if (subject_line !== undefined) updateData.subject_line = subject_line;
    if (includes_discount !== undefined) updateData.includes_discount = includes_discount;
    if (discount_type !== undefined) updateData.discount_type = discount_type;
    if (discount_value !== undefined) updateData.discount_value = discount_value;
    if (discount_description !== undefined) updateData.discount_description = discount_description;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: 'No valid fields provided for update'
      }, { status: 400 });
    }

    try {
      const { data: template, error } = await supabase
        .from('birthday_templates')
        .update(updateData)
        .eq('id', template_id)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          return NextResponse.json({
            error: 'Template update not available. Database migration required.',
            migration_needed: true
          }, { status: 400 });
        }
        
        return NextResponse.json({
          error: 'Failed to update template',
          details: error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Template updated successfully',
        template: template
      });

    } catch (err) {
      return NextResponse.json({
        error: 'Template update not available. Database migration required.',
        migration_needed: true
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get default templates
function getDefaultTemplates(templateType, messageType) {
  const templates = [];
  const typeTemplates = DEFAULT_TEMPLATES[templateType] || DEFAULT_TEMPLATES.birthday;

  if (!messageType || messageType === 'sms') {
    templates.push({
      id: `default-${templateType}-sms`,
      template_name: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} SMS - Default`,
      template_type: templateType,
      message_type: 'sms',
      subject_line: null,
      message_content: typeTemplates.sms,
      includes_discount: true,
      discount_type: 'percentage',
      discount_value: templateType === 'birthday' ? 15 : 20,
      discount_description: `${templateType === 'birthday' ? 15 : 20}% off your next service`,
      discount_expiry_days: 30,
      is_active: true,
      is_default: true,
      times_used: 0,
      created_at: new Date().toISOString(),
      barbershop_id: 'default'
    });
  }

  if (!messageType || messageType === 'email') {
    templates.push({
      id: `default-${templateType}-email`,
      template_name: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Email - Default`,
      template_type: templateType,
      message_type: 'email',
      subject_line: typeTemplates.email.subject,
      message_content: typeTemplates.email.content,
      includes_discount: true,
      discount_type: 'percentage',
      discount_value: templateType === 'birthday' ? 15 : 20,
      discount_description: `${templateType === 'birthday' ? 15 : 20}% off your next service`,
      discount_expiry_days: 30,
      is_active: true,
      is_default: true,
      times_used: 0,
      created_at: new Date().toISOString(),
      barbershop_id: 'default'
    });
  }

  return templates;
}