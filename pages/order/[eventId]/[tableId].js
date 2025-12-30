import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, getEvent, getCategories, getMenuItems, getEventMenu, createOrder, createOrderItems, getTableOrders } from '../../../lib/supabase'

const colors = {
  noir: '#08080a', onyx: '#1a1a1c', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0',
  border: 'rgba(255,255,255,0.15)', textMuted: 'rgba(255,255,255,0.65)'
}

export default function OrderPage() {
  const router = useRouter()
  const { eventId, tableId } = router.query

  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('splash')
  const [event, setEvent] = useState(null)
  const [table, setTable] = useState(null)
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [eventMenu, setEventMenu] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [orderHistory, setOrderHistory] = useState([])
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [paymentType, setPaymentType] = useState(null)
  const [assignedWaiter, setAssignedWaiter] = useState(null)

  useEffect(() => {
    if (eventId && tableId) loadData()
  }, [eventId, tableId])

  const loadData = async () => {
    try {
      // Get event
      const { data: eventData } = await getEvent(eventId)
      setEvent(eventData)

      // Get table
      const { data: tableData } = await supabase.from('event_tables').select('*').eq('id', tableId).single()
      setTable(tableData)

      // Get categories - filter duplicates
      const { data: cats } = await getCategories(eventData?.venue_id)
      if (cats) { 
        const uniqueCats = cats.filter((cat, index, self) => 
          index === self.findIndex(c => c.slug === cat.slug)
        )
        setCategories(uniqueCats)
        setSelectedCat(uniqueCats[0]?.slug) 
      }

      // Get menu items
      const { data: items } = await getMenuItems(eventData?.venue_id)
      if (items) setMenuItems(items)

      // Get event-specific pricing
      const { data: em } = await getEventMenu(eventId)
      if (em) setEventMenu(em)

      // Get assigned waiter for this table
      const { data: assignment } = await supabase.from('table_assignments').select('waiter_id').eq('event_table_id', tableId).eq('event_id', eventId).single()
      if (assignment?.waiter_id) setAssignedWaiter(assignment.waiter_id)
      
      // Get order history for this table
      await loadHistory()

      setLoading(false)
      setTimeout(() => setScreen('welcome'), 2000)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    const { data } = await getTableOrders(tableId)
    if (data) setOrderHistory(data)
  }

  const getPrice = (item) => {
    const em = eventMenu.find(m => m.menu_item_id === item.id)
    return em?.custom_price ?? item.default_price
  }

  const addToCart = (item) => {
    const price = getPrice(item)
    const existing = cart.find(c => c.id === item.id)
    if (existing) setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    else setCart([...cart, { ...item, price, qty: 1 }])
  }

  const removeFromCart = (id) => {
    const existing = cart.find(c => c.id === id)
    if (existing?.qty > 1) setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c))
    else setCart(cart.filter(c => c.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  // Smart Upsell System
  const DEFAULT_PAIRINGS = {
    bottle: ['soft', 'energy-drinks', 'juice'],
    vodka: ['soft', 'energy-drinks'],
    rum: ['soft'],
    whiskey: ['soft'],
    gin: ['soft'],
    wine: ['food'],
    cocktail: ['food', 'snacks'],
    beer: ['food', 'snacks'],
    shot: ['shot']
  }
  
  const UPSELL_MESSAGES = {
    bottle: '🔥 92% adaugă mixere la sticle',
    vodka: '💡 Perfect cu Red Bull sau Cola',
    rum: '🥤 Majoritatea combină cu Cola',
    whiskey: '🥃 Recomandăm cu Cola sau neat',
    cocktail: '🍽️ Merge perfect cu snacks',
    beer: '🍕 Clienții mai comandă și mâncare',
    shot: '🎉 Ia 6, atmosfera e mai bună!',
    default: '💡 Alți clienți mai comandă:'
  }
  
  const getUpsellSuggestions = () => {
    if (cart.length === 0) return { suggestions: [], message: '' }
    
    const cartProductTypes = cart.map(c => c.product_type || 'other')
    const cartCategorySlugs = cart.map(c => c.categories?.slug || '')
    const cartItemIds = cart.map(c => c.id)
    
    let targetCategories = new Set()
    let message = UPSELL_MESSAGES.default
    
    // Find what to suggest based on cart contents
    for (const pType of cartProductTypes) {
      const pairings = DEFAULT_PAIRINGS[pType]
      if (pairings) {
        pairings.forEach(cat => targetCategories.add(cat))
        if (UPSELL_MESSAGES[pType]) message = UPSELL_MESSAGES[pType]
      }
    }
    
    // If bottle service, prioritize mixers
    if (cartProductTypes.includes('bottle')) {
      message = UPSELL_MESSAGES.bottle
    }
    
    // Get suggestions from target categories
    let suggestions = menuItems.filter(item => {
      // Don't suggest items already in cart
      if (cartItemIds.includes(item.id)) return false
      // Don't suggest unavailable items
      if (item.is_available === false) return false
      // Match target categories
      const itemCatSlug = item.categories?.slug || ''
      return Array.from(targetCategories).some(target => 
        itemCatSlug.toLowerCase().includes(target.toLowerCase())
      )
    })
    
    // Sort: popular items first, then by price (low to high)
    suggestions.sort((a, b) => {
      if (a.badge === 'popular' && b.badge !== 'popular') return -1
      if (b.badge === 'popular' && a.badge !== 'popular') return 1
      return (a.default_price || 0) - (b.default_price || 0)
    })
    
    return { suggestions: suggestions.slice(0, 4), message }
  }
  
  const { suggestions: upsellSuggestions, message: upsellMessage } = getUpsellSuggestions()

  const placeOrder = async (pType) => {
    try {
      const orderData = {
        venue_id: event?.venue_id, event_id: eventId, event_table_id: tableId,
        table_number: table?.table_number, payment_type: pType,
        waiter_id: assignedWaiter,
        subtotal: cartTotal, total: cartTotal, status: 'new'
      }
      const { data: order, error } = await createOrder(orderData)
      if (error) throw error

      const orderItems = cart.map(item => ({
        order_id: order.id, menu_item_id: item.id, name: item.name,
        price: item.price, quantity: item.qty, subtotal: item.price * item.qty
      }))
      await createOrderItems(orderItems)

      setPaymentType(pType)
      setOrderPlaced(true)
      setShowCart(false)
      setTimeout(() => { setOrderPlaced(false); setPaymentType(null); setCart([]) }, 4000)
    } catch (error) {
      console.error('Order error:', error)
      alert('Eroare la plasarea comenzii')
    }
  }

  const filteredItems = menuItems.filter(item => item.categories?.slug === selectedCat)

  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: '300' },
    splash: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    logo: { fontSize: '48px', fontWeight: '300', letterSpacing: '20px', color: colors.champagne },
    header: { position: 'sticky', top: 0, zIndex: 40, backgroundColor: colors.noir, borderBottom: `1px solid ${colors.border}` },
    headerTop: { padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    categories: { padding: '0 16px 16px', overflowX: 'auto', display: 'flex', gap: '0' },
    catBtn: { padding: '12px 20px', border: 'none', borderBottom: '2px solid transparent', backgroundColor: 'transparent', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' },
    menu: { padding: '16px', paddingBottom: '140px' },
    menuItem: { borderBottom: `1px solid ${colors.border}`, padding: '20px 0' },
    btn: { padding: '12px 20px', border: 'none', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' },
    floatingCart: { position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 30 },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 },
    cartModal: { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.onyx, maxHeight: '90vh', zIndex: 51, display: 'flex', flexDirection: 'column' },
    centerModal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors.onyx, padding: '40px', width: 'calc(100% - 48px)', maxWidth: '360px', zIndex: 51, textAlign: 'center' },
  }

  if (loading) return <div style={s.container}><div style={s.splash}><div style={s.logo}>S I P</div><div style={{marginTop:'16px', fontSize:'11px', color:colors.textMuted, letterSpacing:'4px'}}>LOADING...</div></div></div>

  if (screen === 'splash') return <div style={s.container}><div style={s.splash}><div style={s.logo}>S I P</div><div style={{width:'60px', height:'1px', backgroundColor:colors.champagne, margin:'20px 0', opacity:0.5}} /><div style={{fontSize:'10px', letterSpacing:'4px', color:colors.platinum}}>ELEVATE THE NIGHT</div></div></div>

  if (screen === 'welcome') return (
    <div style={s.container}>
      <Head><title>S I P - {table?.table_number}</title></Head>
      <div style={{...s.splash, padding:'32px', textAlign:'center'}}>
        <div style={{fontSize:'11px', letterSpacing:'4px', color:colors.textMuted, marginBottom:'32px'}}>{event?.venues?.name || 'S I P'}</div>
        <div style={{fontSize:'40px', fontWeight:'300', letterSpacing:'4px', color:colors.champagne, marginBottom:'8px'}}>{table?.table_number}</div>
        <div style={{fontSize:'13px', letterSpacing:'2px', color:colors.platinum, marginBottom:'48px'}}>Your table awaits</div>
        <button onClick={() => setScreen('menu')} style={{...s.btn, padding:'18px 48px', border:`1px solid ${colors.champagne}`, backgroundColor:'transparent', color:colors.champagne}}>View Menu</button>
      </div>
    </div>
  )

  return (
    <div style={s.container}>
      <Head><title>S I P - Menu</title></Head>

      <header style={s.header}>
        <div style={s.headerTop}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <span style={{fontSize:'16px', fontWeight:'300', letterSpacing:'6px', color:colors.champagne}}>S I P</span>
            <span style={{width:'1px', height:'20px', backgroundColor:colors.border}} />
            <span style={{fontSize:'12px', letterSpacing:'2px', color:colors.platinum}}>{table?.table_number}</span>
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={() => { loadHistory(); setShowHistory(true) }} style={{padding:'12px', border:`1px solid ${colors.border}`, backgroundColor:'transparent', color:colors.platinum, fontSize:'14px'}}>📋</button>
            <button onClick={() => setShowCart(true)} style={{position:'relative', padding:'12px', border:`1px solid ${colors.champagne}`, backgroundColor:colors.champagne, color:colors.noir}}>
              🛒 {cartCount > 0 && <span style={{position:'absolute', top:'-8px', right:'-8px', width:'20px', height:'20px', backgroundColor:colors.noir, color:colors.champagne, border:`1px solid ${colors.champagne}`, fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center'}}>{cartCount}</span>}
            </button>
          </div>
        </div>
        <div style={s.categories}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.slug)} style={{...s.catBtn, color: selectedCat===cat.slug ? colors.champagne : colors.textMuted, borderBottomColor: selectedCat===cat.slug ? colors.champagne : 'transparent'}}>{cat.name}</button>
          ))}
        </div>
      </header>

      <main style={s.menu}>
        {filteredItems.map(item => {
          const price = getPrice(item)
          const inCart = cart.find(c => c.id === item.id)
          return (
            <div key={item.id} style={s.menuItem}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'15px', fontWeight:'400', letterSpacing:'1px', marginBottom:'4px'}}>{item.name} {item.badge && <span style={{fontSize:'8px', padding:'2px 6px', border:`1px solid ${item.badge === 'popular' ? '#ef4444' : item.badge === 'premium' ? colors.champagne : item.badge === 'new' ? '#22c55e' : '#3b82f6'}`, color: item.badge === 'popular' ? '#ef4444' : item.badge === 'premium' ? colors.champagne : item.badge === 'new' ? '#22c55e' : '#3b82f6', marginLeft:'8px', textTransform:'uppercase'}}>{item.badge}</span>}</div>
                  <div style={{fontSize:'12px', color:colors.textMuted}}>{item.description}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'15px', color:colors.champagne, marginBottom:'8px'}}>{price} <span style={{fontSize:'10px', color:colors.textMuted}}>LEI</span></div>
                  {inCart ? (
                    <div style={{display:'flex', border:`1px solid ${colors.champagne}`}}>
                      <button onClick={() => removeFromCart(item.id)} style={{width:'32px', height:'32px', border:'none', backgroundColor:'transparent', color:colors.champagne}}>-</button>
                      <span style={{width:'32px', display:'flex', alignItems:'center', justifyContent:'center', color:colors.champagne, borderLeft:`1px solid ${colors.champagne}`, borderRight:`1px solid ${colors.champagne}`}}>{inCart.qty}</span>
                      <button onClick={() => addToCart(item)} style={{width:'32px', height:'32px', border:'none', backgroundColor:'transparent', color:colors.champagne}}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={{...s.btn, padding:'8px 16px', backgroundColor:'transparent', border:`1px solid ${colors.border}`, color:colors.platinum}}>Select</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {cartCount > 0 && !showCart && (
        <div style={s.floatingCart}>
          <button onClick={() => setShowCart(true)} style={{width:'100%', padding:'18px 20px', backgroundColor:colors.champagne, color:colors.noir, border:'none', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontSize:'12px', letterSpacing:'2px'}}>{cartCount} ITEMS</span>
            <span style={{fontSize:'16px', fontWeight:'400'}}>{cartTotal} LEI →</span>
          </button>
        </div>
      )}

      {showCart && (
        <>
          <div style={s.modal} onClick={() => setShowCart(false)} />
          <div style={s.cartModal}>
            <div style={{padding:'16px', borderBottom:`1px solid ${colors.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div><h2 style={{fontSize:'14px', letterSpacing:'3px', textTransform:'uppercase', margin:0}}>Your Selection</h2><p style={{fontSize:'11px', color:colors.textMuted, margin:'4px 0 0'}}>{table?.table_number}</p></div>
              <button onClick={() => setShowCart(false)} style={{background:'none', border:'none', color:colors.platinum, fontSize:'20px', cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'16px', flex:1, overflowY:'auto'}}>
              {cart.map(item => (
                <div key={item.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:`1px solid ${colors.border}`}}>
                  <div><div style={{fontWeight:'400', marginBottom:'4px'}}>{item.name}</div><div style={{fontSize:'12px', color:colors.textMuted}}>{item.price} × {item.qty}</div></div>
                  <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{color:colors.champagne}}>{item.price * item.qty} LEI</span>
                    <div style={{display:'flex', border:`1px solid ${colors.border}`}}>
                      <button onClick={() => removeFromCart(item.id)} style={{width:'28px', height:'28px', border:'none', backgroundColor:'transparent', color:colors.platinum}}>-</button>
                      <button onClick={() => addToCart(item)} style={{width:'28px', height:'28px', border:'none', backgroundColor:'transparent', color:colors.platinum, borderLeft:`1px solid ${colors.border}`}}>+</button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Smart Upsell Section */}
              {upsellSuggestions.length > 0 && (
                <div style={{marginTop:'20px', padding:'16px', backgroundColor:'rgba(212,175,55,0.08)', borderRadius:'12px', border:`1px solid rgba(212,175,55,0.2)`}}>
                  <div style={{fontSize:'12px', letterSpacing:'2px', color:colors.champagne, marginBottom:'12px', fontWeight:'500'}}>COMPLETEAZĂ COMANDA</div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
                    {upsellSuggestions.map(item => (
                      <div key={item.id} onClick={() => addToCart(item)} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', backgroundColor:'rgba(0,0,0,0.3)', borderRadius:'8px', cursor:'pointer', border:`1px solid ${colors.border}`}}>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontSize:'12px', fontWeight:'400', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{item.name}</div>
                          <div style={{fontSize:'11px', color:colors.champagne}}>{getPrice(item)} LEI</div>
                        </div>
                        <div style={{width:'24px', height:'24px', borderRadius:'50%', backgroundColor:colors.champagne, color:colors.noir, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'600', marginLeft:'8px', flexShrink:0}}>+</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:'10px', fontSize:'11px', color:colors.textMuted, textAlign:'center'}}>{upsellMessage}</div>
                </div>
              )}
            </div>
            <div style={{padding:'16px', borderTop:`1px solid ${colors.border}`}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <span style={{fontSize:'11px', letterSpacing:'2px', color:colors.textMuted}}>TOTAL</span>
                <span style={{fontSize:'28px', fontWeight:'300', color:colors.champagne}}>{cartTotal} <span style={{fontSize:'14px'}}>LEI</span></span>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <button onClick={() => placeOrder('cash')} style={{...s.btn, padding:'18px', backgroundColor:'transparent', border:`1px solid ${colors.border}`, color:colors.platinum, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                  <span>💵</span><span>Cash</span><span style={{fontSize:'8px', opacity:0.6}}>Staff assists</span>
                </button>
                <button onClick={() => placeOrder('card')} style={{...s.btn, padding:'18px', backgroundColor:colors.champagne, color:colors.noir, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                  <span>💳</span><span>Card</span><span style={{fontSize:'8px', opacity:0.6}}>POS payment</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {orderPlaced && (
        <>
          <div style={s.modal} />
          <div style={s.centerModal}>
            <div style={{fontSize:'48px', marginBottom:'20px'}}>✓</div>
            <h3 style={{fontSize:'14px', letterSpacing:'3px', textTransform:'uppercase', marginBottom:'12px'}}>{paymentType === 'card' ? 'Order Confirmed' : 'Staff Notified'}</h3>
            <p style={{color:colors.textMuted, fontSize:'13px', lineHeight:'1.7'}}>{paymentType === 'card' ? 'A member of our team will arrive with the POS terminal.' : 'Your order is placed. Staff will arrive to collect payment.'}</p>
          </div>
        </>
      )}

      {/* Order History Modal */}
      {showHistory && (
        <>
          <div style={s.modal} onClick={() => setShowHistory(false)} />
          <div style={s.cartModal}>
            <div style={{padding:'16px', borderBottom:`1px solid ${colors.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div><h2 style={{fontSize:'14px', letterSpacing:'3px', textTransform:'uppercase', margin:0}}>Order History</h2><p style={{fontSize:'11px', color:colors.textMuted, margin:'4px 0 0'}}>{table?.table_number}</p></div>
              <button onClick={() => setShowHistory(false)} style={{background:'none', border:'none', color:colors.platinum, fontSize:'20px', cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'16px', flex:1, overflowY:'auto'}}>
              {orderHistory.length === 0 ? (
                <div style={{textAlign:'center', padding:'32px', color:colors.textMuted}}>
                  <div style={{fontSize:'32px', marginBottom:'12px'}}>📋</div>
                  <p>No orders yet</p>
                </div>
              ) : (
                orderHistory.map(order => (
                  <div key={order.id} style={{padding:'16px', borderBottom:`1px solid ${colors.border}`, marginBottom:'12px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                      <span style={{fontSize:'11px', color:colors.textMuted}}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{fontSize:'10px', padding:'2px 8px', backgroundColor: order.payment_status === 'paid' ? 'rgba(34,197,94,0.2)' : order.status === 'new' ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.2)', color: order.payment_status === 'paid' ? '#22c55e' : order.status === 'new' ? '#ef4444' : colors.champagne, borderRadius:'4px'}}>
                        {order.payment_status === 'paid' ? '✓ Paid' : order.status === 'new' ? 'Pending' : order.status === 'preparing' ? 'Preparing' : 'Ready'}
                      </span>
                    </div>
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'4px 0'}}>
                        <span>{item.quantity}× {item.name}</span>
                        <span style={{color:colors.textMuted}}>{item.subtotal} LEI</span>
                      </div>
                    ))}
                    <div style={{marginTop:'8px', paddingTop:'8px', borderTop:`1px solid ${colors.border}`, display:'flex', justifyContent:'space-between'}}>
                      <span style={{fontSize:'11px', color:colors.textMuted}}>{order.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}</span>
                      <span style={{fontWeight:'500', color:colors.champagne}}>{order.total} LEI</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
