' : 6, backgroundColor: hRes ? `${colors.warning}25` : mine ? `${colors.champagne}25` : `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: clickable ? 'pointer' : 'default', fontSize: 9, fontWeight: 700, color: hRes ? colors.warning : mine ? colors.champagne : cfg.color, opacity: showOnly && !mine ? 0.4 : 1 }}>{showTxt ? t.table_number : ''}</div>
          }))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 10, color: colors.textMuted, flexWrap: 'wrap' }}><span>🟡 Masa ta (click = comandă)</span><span>🟠 Rezervată</span><span>🔵 Alte mese</span></div>
      </div>
    )
  }

  if (!waiter) return (
    <div style={s.container}><Head><title>S I P - Staff</title></Head>
      <div style={s.loginContainer}>
        <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 16, color: colors.champagne, marginBottom: 8 }}>S I P</div>
        <div style={{ fontSize: 11, letterSpacing: 4, color: colors.textMuted, marginBottom: 48 }}>STAFF LOGIN</div>
        <div style={{ width: '100%', maxWidth: 300 }}>
          <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="07XX XXX XXX" style={s.input} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
          {loginError && <div style={{ color: colors.error, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ ...s.btn, width: '100%', backgroundColor: colors.champagne, color: colors.noir, padding: 16 }}>Intră</button>
        </div>
        <Link href="/" style={{ marginTop: 48, fontSize: 11, color: colors.textMuted, textDecoration: 'none' }}>← Înapoi</Link>
      </div>
    </div>
  )

  if (loading) return <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{fontSize: 32, fontWeight: 300, letterSpacing: 12, color: colors.champagne}}>S I P</div></div>

  const newO = orders.filter(o => o.status === 'new'), prepO = orders.filter(o => o.status === 'preparing'), readyO = orders.filter(o => o.status === 'ready')

  return (
    <div style={s.container}>
      <Head><title>S I P - Staff</title></Head>
      {newOrderAlert && <div style={s.alertBanner}>🔔 COMANDĂ NOUĂ!</div>}
      <header style={s.header}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={s.logo}>S I P</span></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.success }} title="Live" />
          <span style={{ fontSize: 12, color: colors.platinum }}>👤 {waiter.name}</span>
          <button onClick={handleLogout} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, padding: 8 }}>Ieși</button>
        </div>
      </header>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.onyx }}>
        <select value={selectedEvent?.id || ''} onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value))} style={{ ...s.select, marginBottom: 0 }}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} - {new Date(ev.event_date).toLocaleDateString('ro-RO')}</option>)}
        </select>
      </div>
      <div style={s.tabs}>
        {[{ id: 'orders', label: `🔔 Comenzi ${newO.length > 0 ? `(${newO.length})` : ''}` }, { id: 'tables', label: '🗺️ Mesele mele' }, { id: 'reservations', label: '📋 Rezervări' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'}}>{tab.label}</button>
        ))}
      </div>
      <div style={s.content}>
        {activeTab === 'orders' && <>
          {myTableIdsRef.current.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: colors.warning }}><div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div><p>Nu ai mese atribuite.</p></div>}
          {newO.length > 0 && <><div style={s.title}>🔔 Noi ({newO.length})</div>{newO.map(o => <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${colors.error}` }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><div><div style={{ fontSize: 16, fontWeight: 500 }}>{o.table_number || o.event_tables?.table_number}</div><div style={{ fontSize: 10, color: colors.textMuted }}>{new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div></div><div style={{ fontSize: 18, fontWeight: 500, color: colors.champagne }}>{o.total} LEI</div></div>{o.order_items?.map((i, idx) => <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}><span>{i.quantity}× {i.name}</span><span style={{ color: colors.textMuted }}>{i.subtotal} LEI</span></div>)}<div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}><div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Plată: {o.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}</div><button onClick={() => handleOrderStatus(o.id, 'preparing')} style={{ ...s.btn, width: '100%', backgroundColor: colors.success, color: 'white' }}>✓ Accept</button></div></div>)}</>}
          {prepO.length > 0 && <><div style={{ ...s.title, marginTop: 24 }}>⏳ În pregătire ({prepO.length})</div>{prepO.map(o => <div key={o.id} style={{ ...s.card, opacity: 0.9 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span style={{ fontWeight: 500 }}>{o.table_number || o.event_tables?.table_number}</span><span style={{ marginLeft: 12, color: colors.champagne }}>{o.total} LEI</span><div style={{ fontSize: 10, color: colors.textMuted }}>{o.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div></div><button onClick={() => handleOrderStatus(o.id, 'ready')} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Gata →</button></div></div>)}</>}
          {readyO.length > 0 && <><div style={{ ...s.title, marginTop: 24 }}>✓ De livrat ({readyO.length})</div>{readyO.map(o => <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${colors.champagne}` }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontWeight: 500 }}>{o.table_number || o.event_tables?.table_number}</span><span style={{ fontSize: 18, color: colors.champagne, fontWeight: 500 }}>{o.total} LEI</span></div><div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>{o.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><button onClick={() => handleMarkPaid(o.id, 'cash')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.success}`, color: colors.success }}>💵 Cash</button><button onClick={() => handleMarkPaid(o.id, 'card')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.normal}`, color: colors.normal }}>💳 Card</button></div></div>)}</>}
          {newO.length === 0 && prepO.length === 0 && readyO.length === 0 && myTableIdsRef.current.length > 0 && <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}><div style={{ fontSize: 48, marginBottom: 16 }}>✓</div><p>Nicio comandă activă</p></div>}
        </>}
        {activeTab === 'tables' && <><div style={s.title}>Click pe masa ta = adaugă comandă</div>{renderGrid(true, true)}</>}
        {activeTab === 'reservations' && <><div style={s.title}>Rezervări</div>{renderGrid(false, false)}<div style={{ marginTop: 24 }}>{reservations.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: colors.textMuted }}>Nicio rezervare</div> : reservations.map(r => <div key={r.id} style={s.card}><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 40, height: 40, backgroundColor: `${colors.warning}25`, border: `2px solid ${colors.warning}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: colors.warning }}>{r.event_tables?.table_number || '?'}</div><div><div style={{ fontSize: 14, fontWeight: 500 }}>{r.customer_name} {r.is_vip && '⭐'}</div><div style={{ fontSize: 11, color: colors.textMuted }}>🕐 {r.reservation_time} • 👥 {r.party_size}p</div></div></div></div>)}</div></>}
      </div>

      {/* Table History Modal */}
      {selectedTable && <div style={s.modal} onClick={() => setSelectedTable(null)}><div style={{...s.modalBox, maxHeight: '70vh'}} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>{selectedTable.table_number} - Istoric</span><button onClick={() => setSelectedTable(null)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}>{tableOrders.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted }}>Nicio comandă</div> : tableOrders.map(o => <div key={o.id} style={{ ...s.card, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 11, color: colors.textMuted }}>{new Date(o.created_at).toLocaleString('ro-RO')}</span><span style={{ fontSize: 10, padding: '2px 8px', backgroundColor: o.payment_status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: o.payment_status === 'paid' ? colors.success : colors.error, borderRadius: 4 }}>{o.payment_status === 'paid' ? '✓ Plătit' : 'Neplătit'}</span></div>{o.order_items?.map((i, idx) => <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span>{i.quantity}× {i.name}</span><span>{i.subtotal} LEI</span></div>)}<div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted, fontSize: 11 }}>{o.payment_type === 'cash' ? '💵' : '💳'}</span><span style={{ fontWeight: 500, color: colors.champagne }}>{o.total} LEI</span></div></div>)}</div></div></div>}

      {/* Order Modal */}
      {showOrderModal && orderTable && <div style={s.modal} onClick={() => setShowOrderModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}><div><div style={{ fontSize: 16, fontWeight: 600 }}>Comandă - {orderTable.table_number}</div><div style={{ fontSize: 11, color: colors.textMuted }}>{cart.length} produse • {cartTotal} LEI</div></div><button onClick={() => setShowOrderModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div>
        <div style={s.modalBody}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Caută produs..." style={{...s.input, textAlign: 'left', marginBottom: 16 }} />
          
          {!searchQuery && popularItems.length > 0 && <><div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>🔥 POPULAR</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{popularItems.map(i => <button key={i.id} onClick={() => addToCart(i)} style={{...s.btnSm, backgroundColor: `${colors.error}20`, color: colors.error, border: `1px solid ${colors.error}`}}>{i.name}</button>)}</div></>}
          
          {categories.map(cat => {
            const items = filteredMenu.filter(m => m.category_id === cat.id && m.is_available)
            if (!items.length) return null
            return <div key={cat.id} style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: colors.champagne, marginBottom: 8 }}>{cat.name}</div>{items.map(i => <div key={i.id} onClick={() => addToCart(i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}><div><div style={{ fontWeight: 500 }}>{i.name}</div>{i.description && <div style={{ fontSize: 11, color: colors.textMuted }}>{i.description}</div>}</div><span style={{ color: colors.champagne }}>{i.default_price} LEI</span></div>)}</div>
          })}

          {cart.length > 0 && <>
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `2px solid ${colors.champagne}` }}>
              <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>🛒 COȘ</div>
              {cart.map(i => <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button onClick={() => removeFromCart(i.id)} style={{...s.btnSm, backgroundColor: colors.error, color: '#fff', padding: '4px 10px' }}>−</button><span>{i.qty}× {i.name}</span></div><span style={{ color: colors.champagne }}>{i.default_price * i.qty} LEI</span></div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${colors.border}`, fontSize: 18, fontWeight: 600 }}><span>TOTAL</span><span style={{ color: colors.champagne }}>{cartTotal} LEI</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              <button onClick={() => handlePlaceOrder('cash')} style={{...s.btn, backgroundColor: colors.success, color: '#fff', padding: 16 }}>💵 Cash</button>
              <button onClick={() => handlePlaceOrder('card')} style={{...s.btn, backgroundColor: colors.normal, color: '#fff', padding: 16 }}>💳 Card</button>
            </div>
          </>}
        </div>
      </div></div>}
    </div>
  )
}
