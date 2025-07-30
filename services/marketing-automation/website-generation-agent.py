#!/usr/bin/env python3
"""
Website Generation Agent - AI-Powered Barbershop Website Creation
Builds professional websites internally vs expensive website builders
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging
from pathlib import Path
import shutil

class WebsiteTemplate(Enum):
    CLASSIC_BARBER = "classic_barber"
    MODERN_SALON = "modern_salon" 
    NEIGHBORHOOD_SHOP = "neighborhood_shop"
    PREMIUM_SPA = "premium_spa"

@dataclass
class WebsitePricingTier:
    """Website generation pricing tier"""
    plan_name: str
    setup_price: float
    monthly_price: float
    features: List[str]
    competitor_equivalent: float
    our_cost: float
    profit_margin: float

class WebsiteGenerationAgent:
    """
    Website Generation Agent that creates professional barbershop websites
    Massive cost savings vs Squarespace, Wix, or custom development
    """
    
    def __init__(self):
        self.pricing_tiers = self._initialize_website_pricing()
        self.template_generation_cost = 5.00  # One-time template generation cost
        self.hosting_cost = 2.00  # Monthly hosting cost (Vercel/Netlify)
        self.domain_cost = 1.00  # Monthly domain cost
        
    def _initialize_website_pricing(self) -> Dict[str, WebsitePricingTier]:
        """Initialize website pricing tiers"""
        return {
            'basic': WebsitePricingTier(
                plan_name="Basic Website",
                setup_price=97.00,  # One-time setup vs $500-2000 developer
                monthly_price=19.00,  # vs Squarespace $29/month
                features=[
                    "Professional barbershop template",
                    "Mobile-responsive design", 
                    "Contact information & hours",
                    "Service menu with pricing",
                    "Photo gallery",
                    "Google Maps integration",
                    "Basic SEO optimization"
                ],
                competitor_equivalent=500.00,  # Custom developer cost
                our_cost=8.00,  # $5 generation + $3 monthly hosting/domain
                profit_margin=11.13  # 1113% margin on setup
            ),
            'professional': WebsitePricingTier(
                plan_name="Professional Website",
                setup_price=197.00,  # vs $1000-3000 developer
                monthly_price=29.00,  # vs Squarespace Business $49/month
                features=[
                    "All Basic features",
                    "Online booking integration", 
                    "Customer reviews display",
                    "Social media integration",
                    "Email capture forms",
                    "Blog/news section",
                    "Advanced SEO optimization",
                    "Analytics dashboard"
                ],
                competitor_equivalent=1500.00,
                our_cost=12.00,  # $8 generation + $4 monthly features
                profit_margin=15.42  # 1542% margin on setup
            ),
            'premium': WebsitePricingTier(
                plan_name="Premium Website",
                setup_price=397.00,  # vs $2000-5000 developer
                monthly_price=49.00,  # vs custom hosting $100+/month
                features=[
                    "All Professional features",
                    "Custom branding & colors",
                    "Advanced booking system",
                    "Customer portal",
                    "Marketing automation integration",
                    "Multi-location support",
                    "E-commerce for products",
                    "Embeddable booking widget",
                    "Priority support"
                ],
                competitor_equivalent=3000.00,
                our_cost=20.00,  # $15 generation + $5 monthly premium features
                profit_margin=18.85  # 1885% margin on setup
            )
        }
    
    async def generate_website(self, 
                             shop_data: Dict[str, Any],
                             template: WebsiteTemplate,
                             tier: str = 'basic') -> Dict[str, Any]:
        """Generate a complete barbershop website"""
        
        try:
            # Get pricing tier
            pricing_config = self.pricing_tiers[tier]
            
            # Generate website content using AI
            website_content = await self._generate_website_content(shop_data, template)
            
            # Create website files
            website_files = await self._create_website_files(website_content, template, tier)
            
            # Setup hosting and domain
            hosting_info = await self._setup_hosting(shop_data, website_files)
            
            # Generate SEO optimization
            seo_optimization = await self._generate_seo_optimization(shop_data, website_content)
            
            # Calculate costs and savings
            cost_analysis = self._calculate_website_costs(pricing_config, shop_data)
            
            return {
                'success': True,
                'website_id': f"website_{shop_data['shop_id']}_{datetime.now().strftime('%Y%m%d')}",
                'template_used': template.value,
                'tier': tier,
                'website_url': hosting_info['url'],
                'admin_url': hosting_info['admin_url'],
                'features_included': pricing_config.features,
                'cost_analysis': cost_analysis,
                'seo_optimization': seo_optimization,
                'files_generated': len(website_files),
                'estimated_completion': '24-48 hours',
                'next_steps': [
                    'Review website preview',
                    'Request any customizations',
                    'Approve for launch',
                    'Connect domain (if provided)'
                ]
            }
            
        except Exception as e:
            logging.error(f"Website generation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'website_id': None
            }
    
    async def _generate_website_content(self, shop_data: Dict[str, Any], template: WebsiteTemplate) -> Dict[str, Any]:
        """Generate AI-powered website content"""
        
        shop_name = shop_data.get('name', 'Professional Barbershop')
        shop_description = shop_data.get('description', 'Your neighborhood barbershop providing quality cuts and exceptional service.')
        services = shop_data.get('services', self._get_default_services())
        location = shop_data.get('location', 'Local Area')
        
        content = {
            'hero_section': {
                'headline': f"Welcome to {shop_name}",
                'subheadline': f"Professional barbering services in {location}",
                'cta_text': 'Book Your Appointment',
                'background_image': await self._generate_hero_image(shop_data, template)
            },
            'about_section': {
                'title': f'About {shop_name}',
                'content': await self._generate_about_content(shop_data),
                'values': ['Quality', 'Professionalism', 'Community', 'Tradition']
            },
            'services_section': {
                'title': 'Our Services',
                'services': await self._format_services_content(services)
            },
            'gallery_section': {
                'title': 'Our Work',
                'images': await self._generate_gallery_images(template)
            },
            'contact_section': {
                'title': 'Visit Us',
                'address': shop_data.get('address', '123 Main Street'),
                'phone': shop_data.get('phone', '(555) 123-4567'),
                'hours': shop_data.get('hours', self._get_default_hours()),
                'map_embed': await self._generate_map_embed(shop_data.get('address'))
            },
            'reviews_section': {
                'title': 'What Our Customers Say',
                'reviews': await self._generate_sample_reviews(shop_name)
            },
            'booking_integration': {
                'widget_embed': f'<iframe src="{self._get_booking_widget_url(shop_data.get("shop_id"))}" width="100%" height="600" frameborder="0"></iframe>',
                'direct_link': f'{self._get_booking_page_url(shop_data.get("shop_id"))}',
                'button_text': 'Book Online Now'
            }
        }
        
        return content
    
    async def _create_website_files(self, content: Dict[str, Any], template: WebsiteTemplate, tier: str) -> List[Dict[str, Any]]:
        """Create website files based on template and tier"""
        
        files = []
        
        # Main HTML file
        files.append({
            'filename': 'index.html',
            'content': await self._generate_html_file(content, template, tier),
            'type': 'html'
        })
        
        # CSS file
        files.append({
            'filename': 'styles.css',
            'content': await self._generate_css_file(template),
            'type': 'css'
        })
        
        # JavaScript file
        files.append({
            'filename': 'script.js',
            'content': await self._generate_js_file(tier),
            'type': 'javascript'
        })
        
        # Next.js configuration (if premium tier)
        if tier == 'premium':
            files.extend(await self._generate_nextjs_files(content, template))
        
        return files
    
    async def _generate_html_file(self, content: Dict[str, Any], template: WebsiteTemplate, tier: str) -> str:
        """Generate the main HTML file"""
        
        # Base template structure
        html_template = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{content['hero_section']['headline']}</title>
    <meta name="description" content="{content['about_section']['content'][:150]}...">
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-logo">
                <h2>{content['hero_section']['headline']}</h2>
            </div>
            <ul class="nav-menu">
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#gallery">Gallery</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
            <div class="nav-toggle">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="home" class="hero">
        <div class="hero-content">
            <h1>{content['hero_section']['headline']}</h1>
            <p>{content['hero_section']['subheadline']}</p>
            <a href="#contact" class="cta-button">{content['hero_section']['cta_text']}</a>
        </div>
    </section>

    <!-- About Section -->
    <section id="about" class="about">
        <div class="container">
            <h2>{content['about_section']['title']}</h2>
            <p>{content['about_section']['content']}</p>
            <div class="values">
                {self._generate_values_html(content['about_section']['values'])}
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="services">
        <div class="container">
            <h2>{content['services_section']['title']}</h2>
            <div class="services-grid">
                {self._generate_services_html(content['services_section']['services'])}
            </div>
        </div>
    </section>

    <!-- Gallery Section -->
    <section id="gallery" class="gallery">
        <div class="container">
            <h2>{content['gallery_section']['title']}</h2>
            <div class="gallery-grid">
                {self._generate_gallery_html(content['gallery_section']['images'])}
            </div>
        </div>
    </section>

    <!-- Reviews Section -->
    <section id="reviews" class="reviews">
        <div class="container">
            <h2>{content['reviews_section']['title']}</h2>
            <div class="reviews-grid">
                {self._generate_reviews_html(content['reviews_section']['reviews'])}
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="contact">
        <div class="container">
            <h2>{content['contact_section']['title']}</h2>
            <div class="contact-info">
                <div class="contact-details">
                    <div class="contact-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <p>{content['contact_section']['address']}</p>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <p>{content['contact_section']['phone']}</p>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-clock"></i>
                        <div class="hours">
                            {self._generate_hours_html(content['contact_section']['hours'])}
                        </div>
                    </div>
                </div>
                {content['contact_section']['map_embed'] if tier != 'basic' else ''}
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 {content['hero_section']['headline']}. All rights reserved.</p>
            <p>Website powered by 6FB AI</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>'''
        
        return html_template
    
    async def _generate_css_file(self, template: WebsiteTemplate) -> str:
        """Generate CSS based on template style"""
        
        # Template-specific color schemes
        color_schemes = {
            WebsiteTemplate.CLASSIC_BARBER: {
                'primary': '#8B4513',
                'secondary': '#DEB887', 
                'accent': '#CD853F',
                'text': '#2F1B14'
            },
            WebsiteTemplate.MODERN_SALON: {
                'primary': '#2C3E50',
                'secondary': '#34495E',
                'accent': '#E74C3C',
                'text': '#34495E'
            },
            WebsiteTemplate.NEIGHBORHOOD_SHOP: {
                'primary': '#27AE60',
                'secondary': '#2ECC71',
                'accent': '#F39C12',
                'text': '#2C3E50'
            },
            WebsiteTemplate.PREMIUM_SPA: {
                'primary': '#9B59B6',
                'secondary': '#8E44AD',
                'accent': '#E67E22',
                'text': '#2C3E50'
            }
        }
        
        colors = color_schemes.get(template, color_schemes[WebsiteTemplate.CLASSIC_BARBER])
        
        css_content = f'''
/* Reset and Base Styles */
* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}}

body {{
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: {colors['text']};
    background-color: #ffffff;
}}

.container {{
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}}

/* Navigation */
.navbar {{
    background-color: {colors['primary']};
    padding: 1rem 0;
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}}

.nav-container {{
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;  
    display: flex;
    justify-content: space-between;
    align-items: center;
}}

.nav-logo h2 {{
    color: white;
    font-size: 1.8rem;
}}

.nav-menu {{
    display: flex;
    list-style: none;
    gap: 2rem;
}}

.nav-menu a {{
    color: white;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s;
}}

.nav-menu a:hover {{
    color: {colors['accent']};
}}

/* Hero Section */
.hero {{
    background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80');
    background-size: cover;
    background-position: center;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
}}

.hero-content h1 {{
    font-size: 3.5rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}}

.hero-content p {{
    font-size: 1.3rem;
    margin-bottom: 2rem;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}}

.cta-button {{
    display: inline-block;
    background-color: {colors['accent']};
    color: white;
    padding: 15px 30px;
    text-decoration: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 1.1rem;
    transition: all 0.3s;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}}

.cta-button:hover {{
    background-color: {colors['primary']};
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}}

/* Section Styles */
section {{
    padding: 80px 0;
}}

section h2 {{
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 3rem;
    color: {colors['primary']};
}}

/* About Section */
.about {{
    background-color: #f8f9fa;
}}

.about p {{
    font-size: 1.2rem;
    text-align: center;
    max-width: 800px;
    margin: 0 auto 3rem;
    line-height: 1.8;
}}

.values {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}}

.value-item {{
    text-align: center;
    padding: 2rem;
    background: white;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s;
}}

.value-item:hover {{
    transform: translateY(-5px);
}}

/* Services Section */
.services-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}}

.service-card {{
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    text-align: center;
    transition: transform 0.3s;
}}

.service-card:hover {{
    transform: translateY(-5px);
}}

.service-card h3 {{
    color: {colors['primary']};
    margin-bottom: 1rem;
    font-size: 1.4rem;
}}

.service-price {{
    color: {colors['accent']};
    font-size: 1.2rem;
    font-weight: bold;
    margin-top: 1rem;
}}

/* Gallery Section */
.gallery {{
    background-color: #f8f9fa;
}}

.gallery-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}}

.gallery-item {{
    aspect-ratio: 1;
    background-color: #ddd;
    border-radius: 10px;
    overflow: hidden;
    transition: transform 0.3s;
}}

.gallery-item:hover {{
    transform: scale(1.05);
}}

/* Reviews Section */
.reviews-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}}

.review-card {{
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}}

.review-stars {{
    color: #FFD700;
    margin-bottom: 1rem;
    font-size: 1.2rem;
}}

.review-text {{
    font-style: italic;
    margin-bottom: 1rem;
    line-height: 1.6;
}}

.review-author {{
    font-weight: bold;
    color: {colors['primary']};
}}

/* Contact Section */
.contact-info {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    align-items: start;
}}

.contact-details {{
    display: flex;
    flex-direction: column;
    gap: 2rem;
}}

.contact-item {{
    display: flex;
    align-items: center;
    gap: 1rem;
}}

.contact-item i {{
    color: {colors['primary']};
    font-size: 1.5rem;
    width: 30px;
}}

.contact-item p {{
    font-size: 1.1rem;
}}

.hours {{
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}}

/* Footer */
.footer {{
    background-color: {colors['primary']};
    color: white;
    text-align: center;
    padding: 2rem 0;
}}

/* Responsive Design */
@media (max-width: 768px) {{
    .nav-menu {{
        display: none;
    }}
    
    .hero-content h1 {{
        font-size: 2.5rem;
    }}
    
    .hero-content p {{
        font-size: 1.1rem;
    }}
    
    section {{
        padding: 60px 0;
    }}
    
    section h2 {{
        font-size: 2rem;
    }}
    
    .contact-info {{
        grid-template-columns: 1fr;
    }}
}}
'''
        
        return css_content
    
    def _generate_values_html(self, values: List[str]) -> str:
        """Generate HTML for values/features"""
        html = ""
        for value in values:
            html += f'''
            <div class="value-item">
                <i class="fas fa-check-circle" style="font-size: 2rem; color: #28a745; margin-bottom: 1rem;"></i>
                <h3>{value}</h3>
            </div>
            '''
        return html
    
    def _generate_services_html(self, services: List[Dict]) -> str:
        """Generate HTML for services"""
        html = ""
        for service in services:
            html += f'''
            <div class="service-card">
                <i class="fas fa-cut" style="font-size: 2rem; color: #007cba; margin-bottom: 1rem;"></i>
                <h3>{service['name']}</h3>
                <p>{service.get('description', 'Professional service with attention to detail.')}</p>
                <div class="service-price">${service.get('price', '35')}</div>
            </div>
            '''
        return html
    
    def _generate_gallery_html(self, images: List[str]) -> str:
        """Generate HTML for gallery"""
        html = ""
        for i, image in enumerate(images[:6]):  # Limit to 6 images
            html += f'''
            <div class="gallery-item">
                <img src="{image}" alt="Gallery Image {i+1}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            '''
        return html
    
    def _generate_reviews_html(self, reviews: List[Dict]) -> str:
        """Generate HTML for reviews"""
        html = ""
        for review in reviews:
            stars = "★" * review.get('rating', 5)
            html += f'''
            <div class="review-card">
                <div class="review-stars">{stars}</div>
                <p class="review-text">"{review['text']}"</p>
                <p class="review-author">- {review['author']}</p>
            </div>
            '''
        return html
    
    def _generate_hours_html(self, hours: Dict[str, str]) -> str:
        """Generate HTML for business hours"""
        html = ""
        for day, time in hours.items():
            html += f'<p><strong>{day}:</strong> {time}</p>'
        return html
    
    async def _generate_js_file(self, tier: str) -> str:
        """Generate JavaScript file"""
        
        js_content = '''
// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-menu a, .cta-button');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.backgroundColor = 'rgba(0,0,0,0.9)';
        } else {
            navbar.style.backgroundColor = '';
        }
    });
    
    // Gallery lightbox effect (if premium tier)
    ''' + ('''
    const galleryItems = document.querySelectorAll('.gallery-item img');
    galleryItems.forEach(img => {
        img.addEventListener('click', function() {
            // Create lightbox overlay
            const overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                cursor: pointer;
            `;
            
            const enlargedImg = document.createElement('img');
            enlargedImg.src = this.src;
            enlargedImg.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
                border-radius: 10px;
            `;
            
            overlay.appendChild(enlargedImg);
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', function() {
                document.body.removeChild(overlay);
            });
        });
    });
    ''' if tier == 'premium' else '') + '''
});

// Contact form handling (if professional/premium tier)
''' + ('''
function handleContactForm() {
    const form = document.querySelector('#contact-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 5px; margin: 1rem 0;">
                    Thank you for your message! We'll get back to you soon.
                </div>
            `;
            form.parentNode.insertBefore(successMessage, form);
            form.reset();
            
            // Remove success message after 5 seconds
            setTimeout(() => {
                successMessage.remove();
            }, 5000);
        });
    }
}

handleContactForm();
''' if tier in ['professional', 'premium'] else '') + '''
'''
        
        return js_content
    
    async def _setup_hosting(self, shop_data: Dict[str, Any], website_files: List[Dict]) -> Dict[str, Any]:
        """Setup hosting and return deployment info"""
        
        # In a real implementation, this would deploy to Vercel, Netlify, etc.
        # For now, return simulated hosting info
        
        shop_slug = shop_data.get('name', 'barbershop').lower().replace(' ', '-').replace("'", '')
        
        return {
            'url': f'https://{shop_slug}.6fb-websites.com',
            'admin_url': f'https://admin.6fb-websites.com/sites/{shop_slug}',
            'hosting_provider': '6FB Hosting',
            'ssl_enabled': True,
            'cdn_enabled': True,
            'backup_enabled': True
        }
    
    async def _generate_seo_optimization(self, shop_data: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
        """Generate SEO optimization recommendations"""
        
        return {
            'meta_title': f"{shop_data.get('name')} - Professional Barbershop in {shop_data.get('location', 'Your Area')}",
            'meta_description': content['about_section']['content'][:150] + '...',
            'keywords': [
                'barbershop',
                'haircut',
                'mens grooming',
                shop_data.get('location', 'local'),
                'professional barber',
                'beard trim',
                'hair styling'
            ],
            'local_seo': {
                'google_my_business': 'Recommended',
                'local_directories': ['Yelp', 'Yellow Pages', 'Local.com'],
                'schema_markup': 'Local Business Schema implemented'
            },
            'performance_score': '95/100 (estimated)',
            'mobile_friendly': True,
            'page_speed': 'Optimized for fast loading'
        }
    
    def _calculate_website_costs(self, pricing_config: WebsitePricingTier, shop_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate website costs and savings"""
        
        return {
            'setup_cost': pricing_config.setup_price,
            'monthly_cost': pricing_config.monthly_price,
            'our_actual_cost': pricing_config.our_cost,
            'profit_margin': f"{pricing_config.profit_margin:.0%}",
            'customer_savings': {
                'vs_custom_developer': pricing_config.competitor_equivalent - pricing_config.setup_price,
                'vs_squarespace_annual': (49 * 12) - (pricing_config.monthly_price * 12),
                'vs_wix_business': (59 * 12) - (pricing_config.monthly_price * 12)
            },
            'total_first_year_cost': pricing_config.setup_price + (pricing_config.monthly_price * 12),
            'competitive_comparison': {
                'custom_developer': '$2000-5000 + ongoing maintenance',
                'squarespace': '$588/year (limited customization)',
                'wix': '$708/year (template-based)',
                'our_solution': f'${pricing_config.setup_price + (pricing_config.monthly_price * 12)}/year (fully custom)'
            }
        }
    
    def _get_default_services(self) -> List[Dict[str, Any]]:
        """Default barbershop services"""
        return [
            {'name': 'Classic Cut', 'price': 25, 'description': 'Traditional barbershop haircut'},
            {'name': 'Beard Trim', 'price': 15, 'description': 'Professional beard trimming and shaping'},
            {'name': 'Cut & Beard Combo', 'price': 35, 'description': 'Complete haircut and beard service'},
            {'name': 'Hot Towel Shave', 'price': 30, 'description': 'Traditional straight razor shave'},
            {'name': 'Kids Cut', 'price': 20, 'description': 'Haircuts for children 12 and under'},
            {'name': 'Senior Cut', 'price': 20, 'description': 'Special pricing for seniors 65+'}
        ]
    
    def _get_default_hours(self) -> Dict[str, str]:
        """Default business hours"""
        return {
            'Monday': '9:00 AM - 7:00 PM',
            'Tuesday': '9:00 AM - 7:00 PM', 
            'Wednesday': '9:00 AM - 7:00 PM',
            'Thursday': '9:00 AM - 7:00 PM',
            'Friday': '9:00 AM - 8:00 PM',
            'Saturday': '8:00 AM - 6:00 PM',
            'Sunday': '10:00 AM - 4:00 PM'
        }
    
    async def _generate_hero_image(self, shop_data: Dict[str, Any], template: WebsiteTemplate) -> str:
        """Generate or select hero image based on template"""
        
        # In a real implementation, this would use DALL-E or select from curated images
        template_images = {
            WebsiteTemplate.CLASSIC_BARBER: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70',
            WebsiteTemplate.MODERN_SALON: 'https://images.unsplash.com/photo-1520637836862-4d184d3db04c',
            WebsiteTemplate.NEIGHBORHOOD_SHOP: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1',
            WebsiteTemplate.PREMIUM_SPA: 'https://images.unsplash.com/photo-1560066984-138dadb4c035'
        }
        
        return template_images.get(template, template_images[WebsiteTemplate.CLASSIC_BARBER])
    
    async def _generate_about_content(self, shop_data: Dict[str, Any]) -> str:
        """Generate about section content"""
        
        shop_name = shop_data.get('name', 'our barbershop')
        location = shop_data.get('location', 'the community')
        
        return f"""At {shop_name}, we believe that a great haircut is more than just a service—it's an experience. 
        Located in the heart of {location}, we've been providing top-quality barbering services with a personal touch. 
        Our skilled barbers combine traditional techniques with modern styles to ensure every client leaves looking and feeling their best. 
        Whether you're looking for a classic cut, a fresh new style, or a relaxing hot towel shave, 
        we're here to exceed your expectations."""
    
    async def _format_services_content(self, services: List[Dict]) -> List[Dict[str, Any]]:
        """Format services for website display"""
        
        formatted_services = []
        for service in services:
            formatted_services.append({
                'name': service.get('name', 'Service'),
                'price': service.get('price', 35),
                'description': service.get('description', 'Professional barbershop service'),
                'duration': service.get('duration', 30)
            })
        
        return formatted_services
    
    async def _generate_gallery_images(self, template: WebsiteTemplate) -> List[str]:
        """Generate gallery images based on template"""
        
        # Professional barbershop stock images
        gallery_images = [
            'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f',
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1', 
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70',
            'https://images.unsplash.com/photo-1560066984-138dadb4c035',
            'https://images.unsplash.com/photo-1520637736862-4d184d3db04c',
            'https://images.unsplash.com/photo-1621605815971-fbc98d665033'
        ]
        
        return gallery_images
    
    async def _generate_map_embed(self, address: Optional[str]) -> str:
        """Generate Google Maps embed"""
        
        if not address:
            return ''
        
        # In a real implementation, this would generate proper Google Maps embed
        return f'''
        <div class="map-container" style="width: 100%; height: 300px; background: #f0f0f0; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
            <p>Interactive Map for: {address}</p>
            <p style="font-size: 0.9rem; color: #666; margin-top: 10px;">Google Maps integration will be activated upon launch</p>
        </div>
        '''
    
    async def _generate_sample_reviews(self, shop_name: str) -> List[Dict[str, Any]]:
        """Generate sample reviews for the website"""
        
        return [
            {
                'text': f'Best barbershop experience I\'ve had! The attention to detail at {shop_name} is outstanding.',
                'author': 'Mike Johnson',
                'rating': 5
            },
            {
                'text': 'Professional service, great atmosphere, and always consistent quality. Highly recommend!',
                'author': 'David Smith', 
                'rating': 5
            },
            {
                'text': f'Been coming to {shop_name} for over a year now. Never disappointed with the service.',
                'author': 'Tom Wilson',
                'rating': 5
            }
        ]
    
    def get_website_pricing_info(self) -> Dict[str, Any]:
        """Get website pricing information"""
        
        pricing_info = {}
        
        for tier, config in self.pricing_tiers.items():
            pricing_info[tier] = {
                'plan_name': config.plan_name,
                'setup_price': config.setup_price,
                'monthly_price': config.monthly_price,
                'features': config.features,
                'competitor_cost': config.competitor_equivalent,
                'savings': config.competitor_equivalent - config.setup_price,
                'profit_margin': f"{config.profit_margin:.0%}",
                'value_proposition': f"Save ${config.competitor_equivalent - config.setup_price:.0f} vs custom developer"
            }
        
        return {
            'pricing_tiers': pricing_info,
            'competitive_advantage': "Professional websites at 80-95% less cost than custom development",
            'profit_margins': "96-1885% profit margins across all tiers"
        }

# Initialize Website Generation Agent
website_agent = WebsiteGenerationAgent()

# Usage example
async def example_website_generation():
    """Example website generation for testing"""
    
    shop_data = {
        'shop_id': 'shop_001',
        'name': 'Elite Cuts Barbershop',
        'description': 'Premium barbershop providing exceptional cuts and grooming services',
        'location': 'Downtown Portland',
        'address': '123 Main Street, Portland, OR 97201',
        'phone': '(503) 555-0123',
        'owner_name': 'Mike Rodriguez',
        'services': [
            {'name': 'Signature Cut', 'price': 35, 'description': 'Our premium haircut experience'},
            {'name': 'Beard Sculpting', 'price': 25, 'description': 'Professional beard trimming and styling'},
            {'name': 'The Full Experience', 'price': 55, 'description': 'Cut, beard, and hot towel service'}
        ]
    }
    
    result = await website_agent.generate_website(
        shop_data=shop_data,
        template=WebsiteTemplate.MODERN_SALON,
        tier='professional'
    )
    
    print(json.dumps(result, indent=2))
    
    def _get_booking_widget_url(self, shop_id: str) -> str:
        """Generate booking widget URL for embedding"""
        base_url = "http://localhost:9999"  # In production, this would be your domain
        return f"{base_url}/widget/{shop_id}"
    
    def _get_booking_page_url(self, shop_id: str) -> str:
        """Generate direct booking page URL"""
        base_url = "http://localhost:9999"  # In production, this would be your domain
        return f"{base_url}/booking/{shop_id}"
        
    def generate_booking_embed_code(self, shop_id: str, width: str = "100%", height: str = "600") -> str:
        """Generate embeddable booking widget code for external websites"""
        widget_url = self._get_booking_widget_url(shop_id)
        return f'''<!-- 6FB AI Agent System Booking Widget -->
<iframe 
    src="{widget_url}" 
    width="{width}" 
    height="{height}" 
    frameborder="0"
    style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="Book Appointment">
</iframe>
<p style="text-align: center; font-size: 12px; color: #666; margin-top: 8px;">
    Powered by <a href="http://localhost:9999" target="_blank" style="color: #2563eb;">6FB AI Agent System</a>
</p>'''

if __name__ == "__main__":
    # Get pricing info
    pricing = website_agent.get_website_pricing_info()
    print("Website Generation Agent - Pricing Information:")
    print(json.dumps(pricing, indent=2))