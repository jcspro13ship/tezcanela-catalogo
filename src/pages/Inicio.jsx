import { Link } from 'react-router-dom'

export default function Inicio() {
  return (
    <div className="pagina-inicio">
      <section className="hero">
        <img
          src={`${import.meta.env.BASE_URL}logo-tezcanela.png`}
          alt="Tez Canela"
          className="hero-logo"
        />
        <p className="hero-eslogan">Moda que refleja tu esencia</p>
        <Link to="/catalogo" className="boton boton-primario">
          Ver catálogo
        </Link>
      </section>

      <section className="seccion-institucional">
        <div className="institucional-bloque">
          <h2>Quiénes somos</h2>
          <p>
            Tez Canela es una marca de ropa dedicada a vestir con calidad, estilo y calidez.
            Seleccionamos cada prenda pensando en mujeres reales, en su día a día y en cómo
            quieren sentirse al vestirla.
          </p>
        </div>
        <div className="institucional-bloque">
          <h2>Misión</h2>
          <p>
            Ofrecer prendas de calidad, cómodas y con estilo, acompañando a nuestras clientas
            con un servicio cercano y honesto.
          </p>
        </div>
        <div className="institucional-bloque">
          <h2>Visión</h2>
          <p>
            Ser una marca de referencia en moda femenina, reconocida por la calidez en su
            servicio y la calidad de sus prendas.
          </p>
        </div>
      </section>
    </div>
  )
}
