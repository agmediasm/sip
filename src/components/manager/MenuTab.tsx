import { useState, useEffect } from 'react'
import { Card, Button, Badge, Modal, Input, EmptyState, Spinner } from '@/components/ui'
import { Section } from '@/components/layout'
import { getCategories, getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/api'
import { colors, borderRadius } from '@/styles/theme'
import type { MenuItem, Category } from '@/types'

interface MenuTabProps {
  venueId: string
  eventId?: string
}

export function MenuTab({ venueId, eventId }: MenuTabProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadMenu()
  }, [venueId])

  const loadMenu = async () => {
    setLoading(true)
    try {
      const [catsRes, itemsRes] = await Promise.all([
        getCategories(venueId),
        getAllMenuItems(venueId),
      ])
      
      if (catsRes.data) {
        setCategories(catsRes.data)
        if (catsRes.data.length > 0 && !selectedCategory) {
          setSelectedCategory(catsRes.data[0].id)
        }
      }
      if (itemsRes.data) {
        setMenuItems(itemsRes.data)
      }
    } catch (err) {
      console.error('Load menu error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = selectedCategory 
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {/* Categories sidebar */}
      <div style={{ width: '200px', flexShrink: 0 }}>
        <h3 style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '12px', textTransform: 'uppercase' }}>
          Categorii
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '10px 12px',
                background: selectedCategory === cat.id ? colors.charcoal : 'transparent',
                border: 'none',
                borderRadius: borderRadius.sm,
                color: selectedCategory === cat.id ? colors.champagne : colors.textSecondary,
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ flex: 1 }}>
        <Section
          title={categories.find(c => c.id === selectedCategory)?.name || 'Meniu'}
          action={
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              + Produs nou
            </Button>
          }
        >
          {filteredItems.length === 0 ? (
            <EmptyState
              icon="🍽️"
              title="Niciun produs"
              description="Adaugă produse în această categorie"
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredItems.map(item => (
                <Card key={item.id} variant="default" padding="md" hoverable>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: colors.ivory, fontWeight: 500 }}>{item.name}</span>
                        {item.badge && (
                          <Badge variant={item.badge as 'popular' | 'premium' | 'new'} size="sm">
                            {item.badge}
                          </Badge>
                        )}
                        {!item.is_available && (
                          <Badge variant="error" size="sm">INDISPONIBIL</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p style={{ fontSize: '12px', color: colors.textMuted, margin: '4px 0 0' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: colors.champagne, fontWeight: 600 }}>
                        {item.default_price} LEI
                      </span>
                      <div style={{ marginTop: '8px' }}>
                        <Button variant="ghost" size="sm" onClick={() => setEditItem(item)}>
                          ✏️
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editItem) && (
        <MenuItemFormModal
          venueId={venueId}
          categories={categories}
          item={editItem}
          selectedCategoryId={selectedCategory}
          onClose={() => {
            setShowCreateModal(false)
            setEditItem(null)
          }}
          onSave={loadMenu}
        />
      )}
    </div>
  )
}

function MenuItemFormModal({
  venueId,
  categories,
  item,
  selectedCategoryId,
  onClose,
  onSave,
}: {
  venueId: string
  categories: Category[]
  item: MenuItem | null
  selectedCategoryId: string | null
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [price, setPrice] = useState(String(item?.default_price || ''))
  const [categoryId, setCategoryId] = useState(item?.category_id || selectedCategoryId || '')
  const [productType, setProductType] = useState(item?.product_type || 'other')
  const [badge, setBadge] = useState(item?.badge || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (item) {
        const result = await updateMenuItem(item.id, {
          name,
          description: description || undefined,
          default_price: Number(price),
          category_id: categoryId,
          product_type: productType as MenuItem['product_type'],
          badge: badge as MenuItem['badge'],
        })
        if (result.status === 'error') throw new Error(result.error || 'Failed')
      } else {
        const result = await createMenuItem(venueId, {
          name,
          description: description || undefined,
          default_price: Number(price),
          category_id: categoryId,
          product_type: productType,
          badge: badge || undefined,
        })
        if (result.status === 'error') throw new Error(result.error || 'Failed')
      }
      onSave()
      onClose()
    } catch (err) {
      setError('Nu s-a putut salva produsul')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !confirm('Sigur vrei să ștergi acest produs?')) return
    setLoading(true)
    try {
      await deleteMenuItem(item.id)
      onSave()
      onClose()
    } catch (err) {
      setError('Nu s-a putut șterge')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={item ? 'Editează produs' : 'Produs nou'} size="md">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Nume"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Mojito"
            fullWidth
          />
          <Input
            label="Descriere (opțional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Rom, mentă, lime, zahăr"
            fullWidth
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input
              label="Preț (LEI)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              fullWidth
            />
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase' }}>
                Categorie
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: colors.charcoal,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  color: colors.ivory,
                  fontSize: '15px',
                }}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p style={{ color: colors.error, fontSize: '13px', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {item && (
              <Button variant="danger" onClick={handleDelete} disabled={loading}>
                Șterge
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Anulează
            </Button>
            <Button variant="primary" type="submit" loading={loading} disabled={!name || !price}>
              {item ? 'Salvează' : 'Creează'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
