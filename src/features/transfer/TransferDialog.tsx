import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bankingKeys, payeesQuery } from '../../api/queries'
import { ApiError } from '../../api/client'
import { createTransfer } from '../../api/transfers'
import type { Account, AccountsResponse, Customer, CustomerResponse } from '../../api/types'
import { formatMoney } from '../../lib/format'
import { transferSchema, toTransferRequest } from './schema'
import type { TransferValues } from './schema'

type Props = { accounts: Account[]; customer: Customer; onClose: () => void }
const recipientFields: FieldPath<TransferValues>[] = ['recipientMode', 'payeeId', 'recipient.name', 'recipient.accountNumber', 'recipient.bank']
const amountFields: FieldPath<TransferValues>[] = ['fromAccountId', 'amount', 'note']
const fieldOrder = [...recipientFields, ...amountFields]

export function TransferDialog({ accounts, customer, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const sending = useRef(false)
  const focusNewRecipient = useRef(false)
  const queryClient = useQueryClient()
  const payees = useQuery(payeesQuery)
  const [step, setStep] = useState(0)
  const [search, setSearch] = useState('')
  const [sendError, setSendError] = useState('')
  const [refreshError, setRefreshError] = useState(false)
  const deposits = accounts.filter(account => account.type !== 'credit')
  const remaining = Math.max(0, customer.dailyTransferLimit - customer.transferredToday)
  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema(accounts, payees.data?.payees ?? [], remaining)),
    mode: 'onBlur', reValidateMode: 'onBlur', shouldUnregister: false,
    defaultValues: { recipientMode: 'saved', payeeId: '', recipient: { name: '', accountNumber: '', bank: '' }, fromAccountId: deposits[0]?.id ?? '', amount: '', note: '' },
  })
  const { register, trigger, getFieldState, setFocus, formState: { errors } } = form
  const values = useWatch({ control: form.control, compute: (values: TransferValues) => values })
  const account = deposits.find(item => item.id === values.fromAccountId)
  const payee = payees.data?.payees.find(item => item.id === values.payeeId)
  const recipient = values.recipientMode === 'saved' ? payee && { name: payee.name, bank: payee.bank, number: payee.accountNumberMasked }
    : { name: values.recipient.name.trim(), bank: values.recipient.bank.trim(), number: `•••• ${values.recipient.accountNumber.slice(-4)}` }

  async function refreshDashboard() {
    setRefreshError(false)
    try {
      await queryClient.invalidateQueries({ queryKey: bankingKeys.all }, { throwOnError: true })
    } catch { setRefreshError(true) }
  }
  const mutation = useMutation({
    mutationFn: createTransfer, retry: false,
    onSuccess: result => {
      // Update authoritative response values first. Refresh failures must never offer to resend.
      queryClient.setQueryData<AccountsResponse>(bankingKeys.accounts, previous => previous && ({ accounts: previous.accounts.map(item => item.id === result.account.id ? { ...item, balance: result.account.balance } : item) }))
      queryClient.setQueryData<CustomerResponse>(bankingKeys.customer, previous => previous && ({ customer: { ...previous.customer, transferredToday: result.dailyLimit.used } }))
      void refreshDashboard()
    },
  })
  const busy = mutation.isPending || form.formState.isSubmitting
  useEffect(() => {
    const element = dialog.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element?.showModal()
    return () => { document.body.style.overflow = previousOverflow; element?.close(); if (opener instanceof HTMLElement) opener.focus() }
  }, [])
  useEffect(() => { heading.current?.focus() }, [step, mutation.isSuccess])
  useEffect(() => {
    if (values.recipientMode === 'new' && focusNewRecipient.current) {
      focusNewRecipient.current = false
      setFocus('recipient.name')
    }
  }, [values.recipientMode, setFocus])

  function focusField(field: FieldPath<TransferValues>) {
    if (field === 'payeeId') {
      const firstPayee = dialog.current?.querySelector<HTMLInputElement>('input[type="radio"]')
      if (firstPayee) firstPayee.focus()
      else dialog.current?.querySelector<HTMLInputElement>('#payee-search')?.focus()
    } else setFocus(field)
  }

  async function advance() {
    const fields = step === 0 ? recipientFields : amountFields
    if (await trigger(fields)) { setSendError(''); setStep(step + 1) }
    else {
      const first = fields.find(field => getFieldState(field).invalid)
      if (first) focusField(first)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    return form.handleSubmit(async data => {
    if (sending.current || mutation.isSuccess) return
    sending.current = true
    setSendError('')
    try { await mutation.mutateAsync(toTransferRequest(data)) }
    catch (error) {
      const apiError = error instanceof ApiError ? error : undefined
      for (const [field, message] of Object.entries(apiError?.fields ?? {})) {
        if (fieldOrder.includes(field as FieldPath<TransferValues>)) form.setError(field as FieldPath<TransferValues>, { type: 'server', message })
      }
      setSendError(apiError && apiError.status < 500 ? apiError.message : "Something went wrong. Your money hasn't left your account. Try again.")
    } finally { sending.current = false }
  }, () => {
    const first = fieldOrder.find(field => getFieldState(field).invalid)
    if (first) { setStep(recipientFields.includes(first) ? 0 : 1); window.setTimeout(() => focusField(first), 0) }
    })(event)
  }
  function fieldError(field: FieldPath<TransferValues>) {
    const message = getFieldState(field, form.formState).error?.message
    return message ? <p className="field-error" id={`${field}-error`}>{message}</p> : null
  }
  function a11y(field: FieldPath<TransferValues>) {
    return { 'aria-invalid': getFieldState(field, form.formState).invalid, 'aria-describedby': getFieldState(field, form.formState).invalid ? `${field}-error` : undefined }
  }
  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter(element => {
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden' && !element.hidden
    })
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (!first || !last) { event.preventDefault(); heading.current?.focus(); return }
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  const result = mutation.data?.transfer
  return <dialog ref={dialog} className="transfer-dialog" onKeyDown={containFocus} aria-labelledby="transfer-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="dialog-header"><h2 id="transfer-title">New transfer</h2><button type="button" className="icon-button" aria-label="Close transfer" onClick={onClose} disabled={busy}>×</button></div>
    {result ? <div className="success-panel" aria-live="polite">
      <h3 ref={heading} tabIndex={-1}>Transfer sent</h3><p className="success-amount amount">{formatMoney(result.amount)}</p>
      <p>to {result.recipient.name} · {result.recipient.bank} · {result.recipient.accountNumberMasked}</p>
      <p>Reference <strong>{result.reference}</strong></p><p>The money should arrive within minutes.</p>
      {refreshError && <div role="alert"><p>Your transfer was sent, but we couldn't refresh your dashboard.</p><button type="button" onClick={() => void refreshDashboard()}>Refresh dashboard</button></div>}
      <button type="button" className="action-button" onClick={onClose}>Back to dashboard</button>
    </div> : <>
      <ol className="stepper" aria-label="Transfer progress">{['Recipient', 'Amount', 'Review'].map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{index + 1} {label}</li>)}</ol>
      <form noValidate onSubmit={event => { event.preventDefault(); if (step < 2) void advance(); else void submit(event) }}>
        <div className="dialog-content">
          <h3 ref={heading} tabIndex={-1}>{['Who are you sending to?', 'How much?', 'Check the details'][step]}</h3>
          {step === 0 && <>
            <label htmlFor="payee-search">Search payees</label><input id="payee-search" type="search" value={search} onChange={event => setSearch(event.target.value)} />
            {payees.isPending && <p role="status">Loading recipients…</p>}
            {payees.isError && <div role="alert">We couldn't load your recipients. <button type="button" onClick={() => void payees.refetch()}>Retry recipients</button></div>}
            <fieldset className="payee-options" aria-describedby={errors.payeeId ? 'payeeId-error' : undefined} aria-invalid={Boolean(errors.payeeId)}><legend>Recipient</legend>
              {(payees.data?.payees ?? []).filter(item => `${item.name} ${item.bank}`.toLowerCase().includes(search.toLowerCase())).map(item => <label className="payee-option" key={item.id}>
                <input type="radio" {...register('payeeId')} value={item.id} checked={values.recipientMode === 'saved' && values.payeeId === item.id} onChange={event => { form.setValue('recipientMode', 'saved'); void register('payeeId').onChange(event) }} />
                <span><strong>{item.name}</strong><small>{item.bank} · {item.accountNumberMasked}</small></span>
              </label>)}
              {payees.isSuccess && payees.data.payees.length === 0 && <p>No saved recipients. Send to someone new below.</p>}
              {payees.isSuccess && payees.data.payees.length > 0 && !payees.data.payees.some(item => `${item.name} ${item.bank}`.toLowerCase().includes(search.toLowerCase())) && <p>No recipients match your search.</p>}
            </fieldset>
            {fieldError('payeeId')}
            <button type="button" className="secondary-button" aria-controls="new-recipient-fields" aria-expanded={values.recipientMode === 'new'} onClick={() => { focusNewRecipient.current = values.recipientMode !== 'new'; form.setValue('recipientMode', values.recipientMode === 'new' ? 'saved' : 'new'); form.clearErrors(recipientFields) }}>Send to someone new</button>
            {values.recipientMode === 'new' && <div className="new-recipient" id="new-recipient-fields">
              <label htmlFor="recipient-name">Recipient name</label><input id="recipient-name" autoComplete="off" {...register('recipient.name')} {...a11y('recipient.name')} />{fieldError('recipient.name')}
              <label htmlFor="recipient-number">Account number (8 digits)</label><input id="recipient-number" inputMode="numeric" autoComplete="off" {...register('recipient.accountNumber')} {...a11y('recipient.accountNumber')} />{fieldError('recipient.accountNumber')}
              <label htmlFor="recipient-bank">Bank</label><input id="recipient-bank" {...register('recipient.bank')} {...a11y('recipient.bank')} />{fieldError('recipient.bank')}
            </div>}
          </>}
          {step === 1 && <>
            <label htmlFor="from-account">From account</label><select id="from-account" {...register('fromAccountId')} {...a11y('fromAccountId')}>{deposits.map(item => <option key={item.id} value={item.id}>{item.name} · {item.maskedNumber}</option>)}</select>{fieldError('fromAccountId')}
            <label htmlFor="transfer-amount">Amount (SGD)</label><input id="transfer-amount" inputMode="decimal" {...register('amount')} {...a11y('amount')} />{fieldError('amount')}
            <div className="quick-amounts">{[50,100,250,500].map(amount => <button key={amount} type="button" onClick={() => form.setValue('amount', amount.toFixed(2), { shouldValidate: true, shouldDirty: true })}>{amount}</button>)}</div>
            <p className="muted">Available {formatMoney(account?.balance ?? 0)}</p><p className="muted">Remaining daily limit {formatMoney(remaining)}</p>
            <label htmlFor="transfer-note">Note (optional) <span>{values.note.length}/50</span></label><input id="transfer-note" {...register('note')} {...a11y('note')} />{fieldError('note')}
          </>}
          {step === 2 && <>
            <dl className="review-summary"><dt>From</dt><dd>{account?.name} · {account?.maskedNumber}</dd><dt>To</dt><dd>{recipient?.name} · {recipient?.bank} · {recipient?.number}</dd><dt>Amount</dt><dd>{formatMoney(Number(values.amount))}</dd><dt>Fee</dt><dd>{formatMoney(0)}</dd><dt>Note</dt><dd>{values.note || '—'}</dd><dt>Total</dt><dd><strong>{formatMoney(Number(values.amount))}</strong></dd></dl>
            <p className="muted">Usually arrives in minutes.</p>
            {sendError && <div className="send-error" role="alert"><p>{sendError}</p>{Object.entries(errors).filter(([key]) => key !== 'root').length > 0 && <p>Go back to edit the highlighted fields.</p>}</div>}
          </>}
        </div>
        <div className="dialog-footer"><button type="button" className="secondary-button" disabled={busy} onClick={() => { if (step === 0) onClose(); else { setSendError(''); setStep(step - 1) } }}>{step === 0 ? 'Cancel' : 'Back'}</button>
          <button type="submit" className="action-button" disabled={busy}>{busy ? 'Sending…' : step === 2 ? 'Confirm transfer' : 'Continue'}</button></div>
      </form>
    </>}
  </dialog>
}

