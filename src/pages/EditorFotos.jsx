// Lista de fotos con vista previa: agregar (hasta 10), reordenar (la primera es la
// portada) y quitar. Cada foto es { key, vista, file?, url? }: las que ya tienen
// url están guardadas; las que tienen file se suben al guardar.
export default function EditorFotos({ fotos, setFotos, bloqueado = false }) {
  function agregar(e) {
    const archivos = [...e.target.files].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    setFotos((actuales) => [
      ...actuales,
      ...archivos.slice(0, Math.max(0, 10 - actuales.length)).map((file) => ({
        key: `${Date.now()}-${Math.random()}`,
        file,
        vista: URL.createObjectURL(file),
        url: null,
      })),
    ])
  }

  const mover = (i, d) =>
    setFotos((f) => {
      const j = i + d
      if (j < 0 || j >= f.length) return f
      const c = [...f]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })
  const quitar = (i) => setFotos((f) => f.filter((_, k) => k !== i))

  return (
    <div className="admin-fotos">
      {fotos.map((f, i) => (
        <div className="admin-foto" key={f.key}>
          <img src={f.vista} alt="" />
          {i === 0 && <span className="admin-foto-portada">Portada</span>}
          {!f.url && <span className="admin-foto-nueva">Nueva</span>}
          <div className="admin-foto-botones">
            <button type="button" disabled={bloqueado || i === 0} onClick={() => mover(i, -1)} aria-label="Mover antes">
              ◀
            </button>
            <button type="button" disabled={bloqueado || i === fotos.length - 1} onClick={() => mover(i, 1)} aria-label="Mover después">
              ▶
            </button>
            <button type="button" disabled={bloqueado} onClick={() => quitar(i)} aria-label="Quitar foto">
              ✕
            </button>
          </div>
        </div>
      ))}
      {fotos.length < 10 && (
        <label className="admin-foto-agregar">
          + Agregar fotos
          <input type="file" accept="image/*" multiple onChange={agregar} disabled={bloqueado} hidden />
        </label>
      )}
    </div>
  )
}
