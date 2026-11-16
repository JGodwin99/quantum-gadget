import React, { useState } from 'react';
import { ArrowRight, Banknote, CheckCircle2, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BLOG_ARTICLES, BRAND_PROFILES } from '../data/blogArticles';
import { StudioImage } from './StudioImage';

export function BrandsPage() {
  const { products, navigate } = useStore();
  return (
    <div className="bg-[#F5F7FB] min-h-[75vh] py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#101828]">
            Partner Brands
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#667085]">
            Explore hardware manufacturers stocked at GizmoHub with official warranty coverage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRAND_PROFILES.map((brand) => {
            const count = products.filter(
              (p) => p.brand.toLowerCase() === brand.name.toLowerCase()
            ).length;
            return (
              <div
                key={brand.name}
                className="bg-white border border-[#EAECF0] rounded-2xl p-6 flex flex-col justify-between space-y-5"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#155EEF]">
                    {brand.specialty}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-bold text-[#101828]">
                    {brand.name}
                  </h2>
                  <p className="mt-2 text-sm text-[#475467] leading-relaxed">
                    {brand.description}
                  </p>
                </div>
                <div className="pt-4 border-t border-[#EAECF0] flex items-center justify-between">
                  <span className="text-xs text-[#667085] tabular-nums">{count} active models</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/shop?brand=${encodeURIComponent(brand.name)}`)}
                    className="text-sm font-semibold text-[#155EEF] hover:text-[#2563EB] inline-flex items-center gap-1"
                  >
                    <span>Shop {brand.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BlogPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeArticle = BLOG_ARTICLES.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="bg-[#F5F7FB] min-h-[75vh] py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#101828]">
            GizmoHub Journal
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#667085]">
            Hardware guides, acoustic engineering explainers, and creator desk setup insights.
          </p>
        </div>

        {activeArticle ? (
          <article className="bg-white border border-[#EAECF0] rounded-2xl overflow-hidden max-w-4xl">
            <div className="aspect-[16/8] bg-[#F5F7FB]">
              <StudioImage
                src={activeArticle.image_key}
                alt={activeArticle.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 sm:p-10 space-y-5">
              <div className="text-xs text-[#667085] flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#155EEF]">{activeArticle.category}</span>
                <span aria-hidden="true">·</span>
                <span>{activeArticle.published_at}</span>
                <span aria-hidden="true">·</span>
                <span>{activeArticle.read_time}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#101828]">
                {activeArticle.title}
              </h2>
              <p className="text-xs text-[#667085]">By {activeArticle.author}</p>
              <div className="space-y-4 text-base text-[#344054] leading-relaxed pt-2">
                {activeArticle.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mt-4 h-10 px-5 rounded-lg border border-[#D0D5DD] text-sm font-semibold text-[#101828] hover:bg-[#F5F7FB]"
              >
                Back to All Articles
              </button>
            </div>
          </article>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_ARTICLES.map((article) => (
              <article
                key={article.id}
                className="bg-white border border-[#EAECF0] rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#F5F7FB]">
                  <StudioImage
                    src={article.image_key}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="text-xs text-[#667085] flex items-center gap-2">
                    <span className="font-semibold text-[#155EEF]">{article.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{article.read_time}</span>
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold text-[#101828] leading-snug">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-sm text-[#475467] flex-1">{article.excerpt}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedId(article.id)}
                    className="mt-5 text-sm font-semibold text-[#155EEF] hover:text-[#2563EB] inline-flex items-center gap-1"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings, deliveryZones } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not send message.');
      setStatus('sent');
      setFeedback(data.message);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setFeedback(err instanceof Error ? err.message : 'Unable to send message.');
    }
  };

  return (
    <div className="bg-[#F5F7FB] min-h-[75vh] py-12 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#101828]">Contact Us</h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#667085]">
            Questions about Cash on Delivery coverage, order confirmations, or product specifications?
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#155EEF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#101828]">Customer Support</p>
                  <p className="text-[#475467]">{settings.support_email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#155EEF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#101828]">Order Confirmation Desk</p>
                  <p className="text-[#475467]">{settings.support_phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#155EEF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#101828]">Active Delivery Regions</p>
                  <p className="text-[#475467]">
                    {deliveryZones
                      .filter((z) => z.is_active)
                      .map((z) => z.city || z.country)
                      .join(' · ') || 'Configured regions'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D0D5DD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Message</label>
              <textarea
                rows={4}
                required
                minLength={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D0D5DD] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="h-11 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
            >
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
            {status === 'sent' && (
              <p className="text-sm text-[#166534] inline-flex items-center gap-1.5 ml-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>{feedback}</span>
              </p>
            )}
            {status === 'error' && <p className="text-sm text-[#B42318]">{feedback}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

export function InfoPolicyPage({ pageKey }: { pageKey: string }) {
  const { deliveryZones, settings, navigate } = useStore();
  const activeZones = deliveryZones.filter((z) => z.is_active);

  if (pageKey === 'shipping') {
    return (
      <div className="bg-[#F5F7FB] min-h-[70vh] py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h1 className="font-display text-3xl font-bold text-[#101828]">Shipping Information</h1>
          <p className="text-sm sm:text-base text-[#475467]">
            GizmoHub delivers exclusively within our verified active Cash on Delivery zones. All shipping fees and free-delivery thresholds are applied transparently at checkout.
          </p>
          <div className="bg-white border border-[#EAECF0] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FB] border-b border-[#EAECF0] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="px-5 py-3">Zone</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Delivery Fee</th>
                  <th className="px-5 py-3">Free Over</th>
                  <th className="px-5 py-3">Estimated Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {activeZones.map((z) => {
                  const threshold = z.free_shipping_threshold ?? settings.free_shipping_threshold;
                  return (
                    <tr key={z.id}>
                      <td className="px-5 py-3.5 font-semibold text-[#101828]">{z.name}</td>
                      <td className="px-5 py-3.5 text-[#475467]">
                        {z.city ? `${z.city}, ${z.country}` : z.country}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums font-medium text-[#101828]">
                        ${z.delivery_fee.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-[#475467]">
                        {threshold ? `$${threshold.toFixed(0)}` : 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 text-[#475467]">{z.estimated_delivery_days}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const contentMap: Record<string, { title: string; sections: Array<{ heading: string; body: string }> }> = {
    returns: {
      title: 'Returns & Refunds',
      sections: [
        {
          heading: '14-Day Hardware Return Support',
          body: 'Unopened or defective gadgets may be returned within 14 days of delivery. Contact support with your order number and checkout phone number to arrange courier pickup.',
        },
        {
          heading: 'Cash on Delivery Refund Processing',
          body: 'Once returned hardware passes inspection, refunds for paid COD orders are issued promptly via bank transfer or store credit according to your preference.',
        },
      ],
    },
    faq: {
      title: 'Frequently Asked Questions',
      sections: [
        {
          heading: 'How does Cash on Delivery work?',
          body: 'Place your order online without entering any card details. Our team confirms your delivery address by phone, dispatches your package, and you pay the exact USD total in cash upon arrival.',
        },
        {
          heading: 'Do I need an account to order?',
          body: 'No. Guest checkout is supported for all orders. Creating an account lets you save delivery addresses and view past orders.',
        },
        {
          heading: 'How do I check my order status?',
          body: 'Visit the Track Your Order page and enter both your order number and the phone number used during checkout.',
        },
      ],
    },
    about: {
      title: 'About GizmoHub',
      sections: [
        {
          heading: 'Curated Consumer Electronics',
          body: 'GizmoHub connects customers with tested audio equipment, titanium wearables, GaN power electronics, and creator camera gear backed by transparent local Cash on Delivery fulfillment.',
        },
      ],
    },
    careers: {
      title: 'Careers at GizmoHub',
      sections: [
        {
          heading: 'Join Our Operations & Product Teams',
          body: `We are growing across logistics coordination, hardware curation, and customer experience. Reach out to ${settings.support_email} with your portfolio or resume.`,
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: 'Data Protection & Verification',
          body: 'Customer names, phone numbers, and delivery addresses are collected solely for order fulfillment and courier verification. Order details are never exposed publicly without phone verification.',
        },
      ],
    },
    terms: {
      title: 'Terms of Service',
      sections: [
        {
          heading: 'Cash on Delivery Orders',
          body: 'All prices are listed in USD. Orders are subject to stock verification and active delivery zone availability at the time of server confirmation.',
        },
      ],
    },
  };

  const doc = contentMap[pageKey] ?? contentMap.about;

  return (
    <div className="bg-[#F5F7FB] min-h-[70vh] py-12 lg:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <h1 className="font-display text-3xl font-bold text-[#101828]">{doc.title}</h1>
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 space-y-6">
          {doc.sections.map((sec) => (
            <div key={sec.heading} className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#101828]">{sec.heading}</h2>
              <p className="text-sm sm:text-base text-[#475467] leading-relaxed">{sec.body}</p>
            </div>
          ))}
          <div className="pt-4 border-t border-[#EAECF0] flex flex-wrap gap-4 text-xs text-[#667085]">
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-[#155EEF]" /> Cash on Delivery Only
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#155EEF]" /> Verified Local Zones
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="h-11 px-6 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB]"
        >
          Browse GizmoHub Catalog
        </button>
      </div>
    </div>
  );
}
