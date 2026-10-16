import { useState } from 'react';
import { Plus, PencilSimple, Trash, Power, Wrench } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { CategoryRecord } from '@/api/hyperlocal';
import { useCategoriesList, useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/hooks/useHyperlocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SectionCard } from '@/components/shared/SectionCard';
import { FormField } from '@/components/shared/FormField';
import { EmptyState } from '@/components/shared/EmptyState';
import { ActionButtons } from '@/components/shared/ActionButtons';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: string;
  priceUnit: string;
  sortOrder: string;
  isActive: boolean;
};

const initial: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  basePrice: '0',
  priceUnit: 'inspection',
  sortOrder: '0',
  isActive: true,
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const errorMessage = (error: any) => {
  const details = error.response?.data?.error?.details;
  if (Array.isArray(details) && details.length) return details.map((d: any) => `${d.path}: ${d.message}`).join(' | ');
  return error.response?.data?.error?.message || 'Failed to save category.';
};

export const ServiceCategoriesPage = () => {
  const [form, setForm] = useState<CategoryForm>(initial);
  const [editing, setEditing] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: categories, isLoading } = useCategoriesList();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const filtered = categories?.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const save = () => {
    if (!form.name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      basePrice: Number(form.basePrice),
      priceUnit: form.priceUnit,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
      icon: 'wrench',
      cityAvailability: [],
    };
    const onSettled = {
      onSuccess: () => {
        toast.success('Service category saved.');
        setEditing('');
        setForm(initial);
        setShowForm(false);
      },
      onError: (e: any) => toast.error(errorMessage(e)),
    };
    if (editing) updateCategory.mutate({ id: editing, payload }, onSettled);
    else createCategory.mutate(payload, onSettled);
  };

  const edit = (item: CategoryRecord) => {
    setEditing(item._id);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      basePrice: String(item.basePrice),
      priceUnit: item.priceUnit,
      sortOrder: String(item.sortOrder || 0),
      isActive: item.isActive,
    });
    setShowForm(true);
    document.getElementById('category-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reset = () => {
    setEditing('');
    setForm(initial);
    setShowForm(false);
  };

  const saving = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service Categories"
        description="Define services your platform offers."
        actions={
          <Button onClick={() => { setShowForm(!showForm); if (!showForm) { setEditing(''); setForm(initial); } }}>
            <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add Category'}
          </Button>
        }
      />

      {showForm && (
        <SectionCard id="category-form" title={editing ? 'Edit Category' : 'Add Category'}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Category Name" required>
                <Input placeholder="e.g. Plumbing Services" value={form.name} onChange={(e) => {
                  const name = e.target.value;
                  setForm({ ...form, name, slug: editing ? form.slug : slugify(name) });
                }} />
              </FormField>
              <FormField label="URL Path" description="Auto-generated from name.">
                <Input placeholder="e.g. plumbing-services" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </FormField>
            </div>

              <FormField label="Description">
              <Input placeholder="Professional plumbing repair and installation" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>

            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="Starting Price (₹)">
                <Input type="number" min="0" placeholder="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
              </FormField>
              <FormField label="Pricing Mode">
                <Select value={form.priceUnit} onValueChange={(v) => setForm({ ...form, priceUnit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Per Inspection</SelectItem>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Display Order">
                <Input type="number" min="0" placeholder="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Category Image">
                <Input placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </FormField>
              <FormField label="Status">
                <label className="flex items-center gap-2 text-sm pt-2">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-primary" />
                  Active
                </label>
              </FormField>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Category'}</Button>
              {editing && <Button type="button" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>}
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Categories" className="p-0">
        <div className="p-4 border-b">
          <SearchFilterBar searchValue={search} onSearchChange={setSearch} onClearSearch={() => setSearch('')} />
        </div>
        <div className="p-4">
          {isLoading ? (
            <EmptyState title="Loading categories…" />
          ) : filtered?.length ? (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div key={item._id} className="group flex items-center gap-4 rounded-lg border bg-card p-3 hover:shadow-sm transition-all">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wrench className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{item.name}</h4>
                      <StatusBadge status={item.isActive ? 'active' : 'inactive'} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      ₹{item.basePrice} · {item.priceUnit}
                      {item.description ? ` · ${item.description}` : ''}
                    </p>
                  </div>
                  <ActionButtons
                    actions={[
                      { label: 'Edit', onClick: () => edit(item), icon: <PencilSimple className="h-3.5 w-3.5" /> },
                      {
                        label: item.isActive ? 'Deactivate' : 'Activate',
                        onClick: () => updateCategory.mutate(
                          { id: item._id, payload: { isActive: !item.isActive } },
                          { onSuccess: () => toast.success(item.isActive ? 'Category deactivated.' : 'Category activated.'), onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update.') },
                        ),
                        icon: <Power className="h-3.5 w-3.5" />,
                      },
                      {
                        label: 'Delete',
                        variant: 'destructive',
                        onClick: () => {
                          if (!window.confirm(`Permanently delete "${item.name}"? This cannot be undone and will be blocked if related records exist.`)) return;
                          deleteCategory.mutate(item._id, {
                            onSuccess: () => toast.success('Category permanently deleted.'),
                            onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to delete category.'),
                          });
                        },
                        icon: <Trash className="h-3.5 w-3.5" />,
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Wrench className="h-8 w-8" />}
              title="No categories yet"
              description={search ? 'No categories match your search.' : 'Add your first service category using the button above.'}
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
};
