from decimal import Decimal
from typing import Annotated

from pydantic import Field

# Nota de 1.0 a 10.0 con un decimal como máximo. decimal_places hace que 9.85
# se rechace en vez de redondearse como haría numeric(3,1) en la base de datos.
Score = Annotated[
    Decimal,
    Field(ge=Decimal("1.0"), le=Decimal("10.0"), max_digits=3, decimal_places=1),
]
