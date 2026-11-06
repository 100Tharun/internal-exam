    AddInterface add = (AddInterface)
            Naming.lookup("rmi://localhost:6000/sonoo");

    SubInterface sub = (SubInterface)
            Naming.lookup("rmi://localhost:6000/sonoo");

    MulInterface mul = (MulInterface)
            Naming.lookup("rmi://localhost:6000/sonoo");

    DivInterface div = (DivInterface)
            Naming.lookup("rmi://localhost:6000/sonoo");

    int x = 20;
    int y = 5;

    System.out.println("Addition: " + add.add(x, y));
    System.out.println("Subtraction: " + sub.sub(x, y));
    System.out.println("Multiplication: " + mul.mul(x, y));
    System.out.println("Division: " + div.div(x, y));
}
