// API reference only. The game supplies the implementation.
using System;
using System.Collections.Generic;
namespace CodeMarket.SDK;

public class Order
{
    public List<Product> GetProducts() => throw new NotSupportedException("Reference stub");
    public int GetCount(Product product) => throw new NotSupportedException("Reference stub");
    public int GetRemaining(Product product) => throw new NotSupportedException("Reference stub");
    public int GetTotal() => throw new NotSupportedException("Reference stub");
    public bool IsDone() => throw new NotSupportedException("Reference stub");
    public bool Remove(Product product) => throw new NotSupportedException("Reference stub");
    public bool RemoveRemaining() => throw new NotSupportedException("Reference stub");
}
